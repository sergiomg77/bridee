import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { auth } from '../middleware/auth';

const router = Router();

// POST /api/swipes
// Upserts on (user_id, boutique_dress_id) — calling with a different direction updates the previous swipe
router.post('/', auth, async (req, res) => {
  const { boutique_dress_id, direction } = req.body as {
    boutique_dress_id?: string;
    direction?: string;
  };

  if (!boutique_dress_id || !direction) {
    res.status(400).json({ data: null, error: 'boutique_dress_id and direction are required' });
    return;
  }

  if (direction !== 'like' && direction !== 'skip') {
    res.status(400).json({ data: null, error: 'direction must be "like" or "skip"' });
    return;
  }

  const { data, error } = await supabase
    .from('user_swipes')
    .upsert(
      { user_id: req.user!.id, boutique_dress_id, direction },
      { onConflict: 'user_id,boutique_dress_id' }
    )
    .select()
    .single();

  if (error) {
    logger.error('POST /swipes failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

// GET /api/swipes/saved
// All boutique_dresses the user has liked, newest first
router.get('/saved', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('user_swipes')
    .select(`
      id,
      created_at,
      boutique_dress_id,
      boutique_dresses(
        id, sku,
        price_sale, price_original, price_currency, price_visible,
        deal_price, deal_percent, deal_active,
        available_sizes,
        dresses(
          id, title, subtitle, silhouette, color_name, style_tags,
          dress_photos(id, path, sort_order, is_tryon_eligible)
        ),
        boutiques(id, name, city)
      )
    `)
    .eq('user_id', req.user!.id)
    .eq('direction', 'like')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /swipes/saved failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

export default router;
