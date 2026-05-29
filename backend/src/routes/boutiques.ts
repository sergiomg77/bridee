import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// Verify the authenticated user owns the given boutique
async function verifyOwnership(boutiqueId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('boutiques')
    .select('id')
    .eq('id', boutiqueId)
    .eq('owner_user_id', userId)
    .maybeSingle();
  return data !== null;
}

function makeSlug(name: string, userId: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const suffix = userId.replace(/-/g, '').slice(0, 6);
  return `${base}-${suffix}`;
}

// ── Listing & discovery ──────────────────────────────────────

// GET /api/boutiques
router.get('/', auth, async (req, res) => {
  const { city, specialty_tags } = req.query as { city?: string; specialty_tags?: string };

  let query = supabase
    .from('boutiques')
    .select('id, name, slug, city, country, logo_path, specialty_tags, tier_label, is_top_rated, status')
    .eq('status', 'active')
    .order('is_top_rated', { ascending: false })
    .order('name', { ascending: true });

  if (city) query = query.eq('city', city);
  if (specialty_tags) query = query.overlaps('specialty_tags', specialty_tags.split(','));

  const { data, error } = await query;

  if (error) {
    logger.error('GET /boutiques failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// GET /api/boutiques/saved  — must be before /:id
router.get('/saved', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('user_saved_boutiques')
    .select(`
      id, created_at,
      boutiques(id, name, city, logo_path, specialty_tags, tier_label, is_top_rated, status)
    `)
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /boutiques/saved failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// GET /api/boutiques/:id — full profile
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  const { data, error } = await supabase
    .from('boutiques')
    .select(`
      *,
      boutique_cover_photos(id, path, sort_order),
      boutique_opening_hours(id, day_of_week, open_time, close_time, is_closed),
      boutique_services(id, name, description, sort_order),
      boutique_promotions(id, title, description, discount_type, discount_value, starts_at, ends_at, is_active)
    `)
    .eq('id', id)
    .eq('status', 'active')
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    res.status(status).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// GET /api/boutiques/:id/dresses
router.get('/:id/dresses', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  const { data, error } = await supabase
    .from('boutique_dresses')
    .select(`
      id, sku,
      price_sale, price_original, price_rental, price_rental_original,
      price_range_min, price_range_max, price_currency, price_visible,
      deal_price, deal_percent, deal_active,
      available_sizes, is_active, created_at, updated_at,
      dresses(
        id, title, subtitle, silhouette, neckline, sleeve, back_style, length, train,
        color_name, color_code, fabric, details, style_tags, event_types,
        condition, availability, additional_services,
        dress_photos(id, path, sort_order, is_tryon_eligible)
      )
    `)
    .eq('boutique_id', id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /boutiques/:id/dresses failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// ── Reviews ──────────────────────────────────────────────────

// GET /api/boutiques/:id/reviews
router.get('/:id/reviews', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  const { data, error } = await supabase
    .from('boutique_reviews')
    .select('id, rating, body, created_at, updated_at, user_id')
    .eq('boutique_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /boutiques/:id/reviews failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// POST /api/boutiques/:id/reviews
router.post('/:id/reviews', auth, async (req, res) => {
  const { id } = req.params as { id: string };
  const { rating, body } = req.body as { rating?: number; body?: string };

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ data: null, error: 'rating must be an integer between 1 and 5' });
    return;
  }

  const { data, error } = await supabase
    .from('boutique_reviews')
    .insert({ boutique_id: id, user_id: req.user!.id, rating, body })
    .select()
    .single();

  if (error) {
    logger.error('POST /boutiques/:id/reviews failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

// ── Appointment slots ─────────────────────────────────────────

// GET /api/boutiques/:id/slots — available (future, not fully booked)
router.get('/:id/slots', auth, async (req, res) => {
  const { id } = req.params as { id: string };
  const today = new Date().toISOString().split('T')[0];

  const { data: slots, error } = await supabase
    .from('appointment_slots')
    .select('*')
    .eq('boutique_id', id)
    .gte('slot_date', today)
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true });

  if (error) {
    logger.error('GET /boutiques/:id/slots failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  // Filter client-side: booked_count < capacity (PostgREST can't compare two columns)
  const available = (slots ?? []).filter(
    (s) => (s.booked_count as number) < (s.capacity as number)
  );

  res.json({ data: available, error: null });
});

// POST /api/boutiques/:id/slots — create availability slots (boutique owner)
router.post('/:id/slots', auth, requireRole('boutique'), async (req, res) => {
  const { id } = req.params as { id: string };

  if (!(await verifyOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { slots } = req.body as {
    slots?: Array<{ slot_date: string; slot_time: string; capacity?: number }>;
  };

  if (!slots || slots.length === 0) {
    res.status(400).json({ data: null, error: 'slots array is required' });
    return;
  }

  const rows = slots.map((s) => ({
    boutique_id: id,
    slot_date: s.slot_date,
    slot_time: s.slot_time,
    capacity: s.capacity ?? 1,
  }));

  const { data, error } = await supabase
    .from('appointment_slots')
    .insert(rows)
    .select();

  if (error) {
    logger.error('POST /boutiques/:id/slots failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

// PUT /api/boutiques/:id/slots/:slotId/block (boutique owner)
router.put('/:id/slots/:slotId/block', auth, requireRole('boutique'), async (req, res) => {
  const { id, slotId } = req.params as { id: string; slotId: string };

  if (!(await verifyOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { data, error } = await supabase
    .from('appointment_slots')
    .update({ capacity: 0 })
    .eq('id', slotId)
    .eq('boutique_id', id)
    .select()
    .single();

  if (error) {
    logger.error('PUT /boutiques/:id/slots/:slotId/block failed', error);
    res.status(error.code === 'PGRST116' ? 404 : 500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// ── Appointments ─────────────────────────────────────────────

// GET /api/boutiques/:id/appointments (boutique owner)
router.get('/:id/appointments', auth, requireRole('boutique'), async (req, res) => {
  const { id } = req.params as { id: string };

  if (!(await verifyOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      appointment_slots(slot_date, slot_time),
      appointment_dresses(boutique_dress_id)
    `)
    .eq('boutique_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /boutiques/:id/appointments failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// ── Save / unsave ─────────────────────────────────────────────

// POST /api/boutiques/:id/save
router.post('/:id/save', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  const { data, error } = await supabase
    .from('user_saved_boutiques')
    .insert({ user_id: req.user!.id, boutique_id: id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ data: null, error: 'Boutique already saved' });
      return;
    }
    logger.error('POST /boutiques/:id/save failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

// DELETE /api/boutiques/:id/save
router.delete('/:id/save', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  const { error } = await supabase
    .from('user_saved_boutiques')
    .delete()
    .eq('user_id', req.user!.id)
    .eq('boutique_id', id);

  if (error) {
    logger.error('DELETE /boutiques/:id/save failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data: { boutique_id: id }, error: null });
});

// ── Boutique CRUD ─────────────────────────────────────────────

// POST /api/boutiques — create boutique (boutique role required)
router.post('/', auth, requireRole('boutique'), async (req, res) => {
  const {
    name,
    about,
    address,
    city,
    country,
    phone,
    zalo,
    whatsapp,
    email,
    website,
    facebook,
    instagram,
    tiktok,
    logo_path,
    specialty_tags,
    credential_tags,
  } = req.body as {
    name?: string;
    about?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    zalo?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    logo_path?: string;
    specialty_tags?: string[];
    credential_tags?: string[];
  };

  if (!name) {
    res.status(400).json({ data: null, error: 'name is required' });
    return;
  }

  if (!zalo) {
    res.status(400).json({ data: null, error: 'zalo is required' });
    return;
  }

  const slug = makeSlug(name, req.user!.id);

  const { data, error } = await supabase
    .from('boutiques')
    .insert({
      owner_user_id: req.user!.id,
      name,
      slug,
      about,
      address,
      city,
      country: country ?? 'VN',
      phone,
      zalo,
      whatsapp,
      email,
      website,
      facebook,
      instagram,
      tiktok,
      logo_path,
      specialty_tags,
      credential_tags,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ data: null, error: 'A boutique with this name already exists' });
      return;
    }
    logger.error('POST /boutiques failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  logger.info(`Boutique created: ${(data as { id: string }).id} by user ${req.user!.id}`);
  res.status(201).json({ data, error: null });
});

// PUT /api/boutiques/:id — update boutique profile (boutique owner)
router.put('/:id', auth, requireRole('boutique'), async (req, res) => {
  const { id } = req.params as { id: string };

  if (!(await verifyOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const {
    name,
    about,
    address,
    city,
    country,
    phone,
    zalo,
    whatsapp,
    email,
    website,
    facebook,
    instagram,
    tiktok,
    logo_path,
    specialty_tags,
    credential_tags,
    latitude,
    longitude,
  } = req.body as {
    name?: string;
    about?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    zalo?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    logo_path?: string;
    specialty_tags?: string[];
    credential_tags?: string[];
    latitude?: number;
    longitude?: number;
  };

  const { data, error } = await supabase
    .from('boutiques')
    .update({
      name,
      about,
      address,
      city,
      country,
      phone,
      zalo,
      whatsapp,
      email,
      website,
      facebook,
      instagram,
      tiktok,
      logo_path,
      specialty_tags,
      credential_tags,
      latitude,
      longitude,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('PUT /boutiques/:id failed', error);
    res.status(error.code === 'PGRST116' ? 404 : 500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

export default router;
