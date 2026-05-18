import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { auth } from '../middleware/auth';

const router = Router();

// GET /api/appointments — bride's appointment list (upcoming + past)
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      appointment_slots(slot_date, slot_time, capacity, booked_count),
      boutiques(id, name, city),
      appointment_dresses(boutique_dress_id)
    `)
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /appointments failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// POST /api/appointments — book an appointment
router.post('/', auth, async (req, res) => {
  const {
    boutique_id,
    slot_id,
    full_name,
    phone,
    special_request,
    try_multiple_dresses,
    guest_count,
    dress_ids,
  } = req.body as {
    boutique_id?: string;
    slot_id?: string;
    full_name?: string;
    phone?: string;
    special_request?: string;
    try_multiple_dresses?: boolean;
    guest_count?: number;
    dress_ids?: string[]; // boutique_dress_ids
  };

  if (!boutique_id || !slot_id || !full_name || !phone) {
    res.status(400).json({
      data: null,
      error: 'boutique_id, slot_id, full_name, and phone are required',
    });
    return;
  }

  // Validate slot: exists, belongs to this boutique, not blocked, not fully booked
  const { data: slot, error: slotErr } = await supabase
    .from('appointment_slots')
    .select('id, boutique_id, capacity, booked_count')
    .eq('id', slot_id)
    .single();

  if (slotErr || !slot) {
    res.status(404).json({ data: null, error: 'Slot not found' });
    return;
  }

  const s = slot as { id: string; boutique_id: string; capacity: number; booked_count: number };

  if (s.boutique_id !== boutique_id) {
    res.status(400).json({ data: null, error: 'Slot does not belong to this boutique' });
    return;
  }

  // capacity = 0 means the slot was explicitly blocked by the boutique
  if (s.capacity === 0) {
    res.status(409).json({ data: null, error: 'This slot has been blocked by the boutique' });
    return;
  }

  if (s.booked_count >= s.capacity) {
    res.status(409).json({ data: null, error: 'This slot is fully booked' });
    return;
  }

  // Insert appointment
  const { data: appointment, error: apptErr } = await supabase
    .from('appointments')
    .insert({
      boutique_id,
      user_id: req.user!.id,
      slot_id,
      status: 'pending',
      full_name,
      phone,
      special_request: special_request ?? null,
      try_multiple_dresses: try_multiple_dresses ?? false,
      guest_count: guest_count ?? 0,
    })
    .select()
    .single();

  if (apptErr) {
    logger.error('POST /appointments: insert failed', apptErr);
    res.status(500).json({ data: null, error: apptErr.message });
    return;
  }

  const appointmentId = (appointment as { id: string }).id;

  // Insert dress preferences (boutique_dress_ids) if provided — non-fatal if it fails
  if (dress_ids && dress_ids.length > 0) {
    const dressRows = dress_ids.map((bdId) => ({
      appointment_id: appointmentId,
      boutique_dress_id: bdId,
    }));

    const { error: dressErr } = await supabase.from('appointment_dresses').insert(dressRows);
    if (dressErr) {
      logger.warn(`POST /appointments: dress insert failed for ${appointmentId}`, dressErr);
    }
  }

  // Increment booked_count on the slot
  const { error: slotUpdateErr } = await supabase
    .from('appointment_slots')
    .update({ booked_count: s.booked_count + 1 })
    .eq('id', slot_id);

  if (slotUpdateErr) {
    logger.warn(`POST /appointments: failed to increment booked_count on slot ${slot_id}`, slotUpdateErr);
  }

  logger.info(`Appointment ${appointmentId} booked for slot ${slot_id}`);
  res.status(201).json({ data: appointment, error: null });
});

// PUT /api/appointments/:id/cancel — cancel an appointment (bride or boutique owner)
router.put('/:id/cancel', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  const { data: appointment, error: fetchErr } = await supabase
    .from('appointments')
    .select('id, user_id, boutique_id, slot_id, status')
    .eq('id', id)
    .single();

  if (fetchErr || !appointment) {
    res.status(404).json({ data: null, error: 'Appointment not found' });
    return;
  }

  const appt = appointment as {
    id: string;
    user_id: string;
    boutique_id: string;
    slot_id: string;
    status: string;
  };

  const isBride = appt.user_id === req.user!.id;
  let isBoutiqueOwner = false;

  if (!isBride) {
    const { data: boutique } = await supabase
      .from('boutiques')
      .select('id')
      .eq('id', appt.boutique_id)
      .eq('owner_user_id', req.user!.id)
      .maybeSingle();
    isBoutiqueOwner = boutique !== null;
  }

  if (!isBride && !isBoutiqueOwner) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  if (appt.status !== 'pending' && appt.status !== 'confirmed') {
    res.status(400).json({ data: null, error: 'Only pending or confirmed appointments can be cancelled' });
    return;
  }

  const newStatus = isBride ? 'cancelled_by_bride' : 'cancelled_by_boutique';

  const { data: updated, error: updateErr } = await supabase
    .from('appointments')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    logger.error('PUT /appointments/:id/cancel: update failed', updateErr);
    res.status(500).json({ data: null, error: updateErr.message });
    return;
  }

  // Release the slot: decrement booked_count so it becomes bookable again
  const { data: slotRow } = await supabase
    .from('appointment_slots')
    .select('booked_count')
    .eq('id', appt.slot_id)
    .single();

  if (slotRow) {
    const current = (slotRow as { booked_count: number }).booked_count;
    const { error: slotErr } = await supabase
      .from('appointment_slots')
      .update({ booked_count: Math.max(0, current - 1) })
      .eq('id', appt.slot_id);

    if (slotErr) {
      logger.warn(`PUT /appointments/:id/cancel: failed to decrement slot ${appt.slot_id}`, slotErr);
    }
  }

  logger.info(`Appointment ${id} → ${newStatus} by user ${req.user!.id}`);
  res.json({ data: updated, error: null });
});

export default router;
