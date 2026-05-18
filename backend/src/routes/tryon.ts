import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { auth } from '../middleware/auth';
import { uploadBase64File } from '../services/storageService';

const router = Router();

const VALID_PHOTO_TYPES = ['full_body', 'face_upper_body'] as const;
type PhotoType = typeof VALID_PHOTO_TYPES[number];

// ── Reference photos ──────────────────────────────────────────

// GET /api/tryon/reference-photos
router.get('/reference-photos', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('user_reference_photos')
    .select('id, photo_type, path, created_at, updated_at')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /tryon/reference-photos failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// POST /api/tryon/reference-photos
// Uploads or replaces a user reference photo. Upserts on (user_id, photo_type).
router.post('/reference-photos', auth, async (req, res) => {
  const { photo_type, image_base64 } = req.body as {
    photo_type?: string;
    image_base64?: string;
  };

  if (!photo_type || !VALID_PHOTO_TYPES.includes(photo_type as PhotoType)) {
    res.status(400).json({
      data: null,
      error: `photo_type must be one of: ${VALID_PHOTO_TYPES.join(', ')}`,
    });
    return;
  }

  if (!image_base64) {
    res.status(400).json({ data: null, error: 'image_base64 is required' });
    return;
  }

  const storagePath = `references/${req.user!.id}/${photo_type}.jpg`;

  try {
    await uploadBase64File('tryon-photos', storagePath, image_base64, 'image/jpeg');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('POST /tryon/reference-photos: upload failed', err);
    res.status(500).json({ data: null, error: message });
    return;
  }

  const { data, error } = await supabase
    .from('user_reference_photos')
    .upsert(
      {
        user_id: req.user!.id,
        photo_type,
        path: storagePath,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,photo_type' }
    )
    .select()
    .single();

  if (error) {
    logger.error('POST /tryon/reference-photos: upsert failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  logger.info(`Reference photo stored: user ${req.user!.id} type ${photo_type}`);
  res.status(201).json({ data, error: null });
});

// ── Try-on jobs ───────────────────────────────────────────────

// POST /api/tryon/jobs — create a new try-on job
router.post('/jobs', auth, async (req, res) => {
  const { boutique_dress_id, dress_photo_id } = req.body as {
    boutique_dress_id?: string;
    dress_photo_id?: string;
  };

  if (!boutique_dress_id || !dress_photo_id) {
    res.status(400).json({
      data: null,
      error: 'boutique_dress_id and dress_photo_id are required',
    });
    return;
  }

  // Resolve user's reference photo — prefer full_body, fall back to first available
  const { data: refPhotos, error: refErr } = await supabase
    .from('user_reference_photos')
    .select('id, photo_type')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: true });

  if (refErr) {
    logger.error('POST /tryon/jobs: reference photo lookup failed', refErr);
    res.status(500).json({ data: null, error: refErr.message });
    return;
  }

  if (!refPhotos || refPhotos.length === 0) {
    res.status(400).json({
      data: null,
      error: 'No reference photo found. Upload a full_body or face_upper_body photo first.',
    });
    return;
  }

  const preferredRef = (refPhotos as Array<{ id: string; photo_type: string }>).find(
    (p) => p.photo_type === 'full_body'
  ) ?? (refPhotos[0] as { id: string; photo_type: string });

  const referencePhotoId = preferredRef.id;

  // Validate dress photo exists and is try-on eligible
  const { data: dressPhoto, error: dpErr } = await supabase
    .from('dress_photos')
    .select('id, is_tryon_eligible')
    .eq('id', dress_photo_id)
    .single();

  if (dpErr || !dressPhoto) {
    res.status(404).json({ data: null, error: 'Dress photo not found' });
    return;
  }

  if (!(dressPhoto as { id: string; is_tryon_eligible: boolean }).is_tryon_eligible) {
    res.status(400).json({ data: null, error: 'This dress photo is not eligible for virtual try-on' });
    return;
  }

  // Create the job
  const { data, error } = await supabase
    .from('tryon_queue')
    .insert({
      user_id: req.user!.id,
      boutique_dress_id,
      reference_photo_id: referencePhotoId,
      dress_photo_id,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    logger.error('POST /tryon/jobs: insert failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  logger.info(`Try-on job created: ${(data as { id: string }).id} for user ${req.user!.id}`);
  res.status(201).json({ data, error: null });
});

// GET /api/tryon/jobs — completed and failed jobs for user
router.get('/jobs', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('tryon_queue')
    .select(
      'id, boutique_dress_id, dress_photo_id, status, result_path, error_message, seen_at, created_at, updated_at'
    )
    .eq('user_id', req.user!.id)
    .in('status', ['completed', 'failed'])
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /tryon/jobs failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// GET /api/tryon/jobs/:id — status and result of a specific job
router.get('/jobs/:id', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  const { data, error } = await supabase
    .from('tryon_queue')
    .select(
      'id, boutique_dress_id, dress_photo_id, status, result_path, error_message, seen_at, created_at, updated_at'
    )
    .eq('id', id)
    .eq('user_id', req.user!.id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    res.status(status).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// DELETE /api/tryon/jobs/:id — delete user's own try-on result
router.delete('/jobs/:id', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  // Verify ownership before delete
  const { data: existing, error: fetchErr } = await supabase
    .from('tryon_queue')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.user!.id)
    .maybeSingle();

  if (fetchErr) {
    logger.error('DELETE /tryon/jobs/:id: fetch failed', fetchErr);
    res.status(500).json({ data: null, error: fetchErr.message });
    return;
  }

  if (!existing) {
    res.status(404).json({ data: null, error: 'Try-on job not found' });
    return;
  }

  const { error: deleteErr } = await supabase
    .from('tryon_queue')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user!.id);

  if (deleteErr) {
    logger.error('DELETE /tryon/jobs/:id: delete failed', deleteErr);
    res.status(500).json({ data: null, error: deleteErr.message });
    return;
  }

  res.json({ data: { id }, error: null });
});

export default router;
