import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

// GET /api/search?q=... — unified search across dresses and boutiques
router.get('/', async (req, res) => {
  const { q } = req.query as { q?: string };

  if (!q || q.trim().length < 2) {
    res.status(400).json({ data: null, error: 'q must be at least 2 characters' });
    return;
  }

  const term = q.trim();

  const [dressResult, boutiqueResult] = await Promise.all([
    supabase
      .from('dresses')
      .select('id, title, designer, silhouette, style_tags')
      .or(`title.ilike.%${term}%,designer.ilike.%${term}%,silhouette.ilike.%${term}%`)
      .eq('is_deleted', false)
      .limit(20),
    supabase
      .from('boutiques')
      .select('id, name, city, logo_path')
      .or(`name.ilike.%${term}%,city.ilike.%${term}%`)
      .eq('status', 'active')
      .limit(20),
  ]);

  if (dressResult.error) {
    logger.error('GET /search: dresses query failed', dressResult.error);
    res.status(500).json({ data: null, error: dressResult.error.message });
    return;
  }

  if (boutiqueResult.error) {
    logger.error('GET /search: boutiques query failed', boutiqueResult.error);
    res.status(500).json({ data: null, error: boutiqueResult.error.message });
    return;
  }

  res.json({
    data: {
      dresses: dressResult.data ?? [],
      boutiques: boutiqueResult.data ?? [],
    },
    error: null,
  });
});

// GET /api/search/suggested — curated keyword suggestions
router.get('/suggested', async (_req, res) => {
  const { data, error } = await supabase
    .from('search_suggested_keywords')
    .select('id, keyword, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(20);

  if (error) {
    logger.error('GET /search/suggested failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

export default router;
