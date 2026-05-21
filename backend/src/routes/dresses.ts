import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// Fields used consistently for list/feed views (cover photo only handled client-side via sort_order=0)
const BOUTIQUE_DRESS_LIST_SELECT = `
  id, sku,
  price_sale, price_original, price_rental, price_currency, price_visible,
  deal_price, deal_percent, deal_active,
  available_sizes, created_at,
  dress_id,
  boutique_id,
  dresses(
    id, title, subtitle, silhouette, color_name, color_code, style_tags, event_types,
    is_deleted,
    dress_photos(id, path, sort_order, is_tryon_eligible)
  ),
  boutiques(id, name, city)
` as const;

// Verify the authenticated user owns at least one boutique that carries the given dress
async function verifyDressOwnership(dressId: string, userId: string): Promise<boolean> {
  const { data: userBoutiques } = await supabase
    .from('boutiques')
    .select('id')
    .eq('owner_user_id', userId);

  const boutiqueIds = (userBoutiques ?? []).map((b) => (b as { id: string }).id);
  if (boutiqueIds.length === 0) return false;

  const { data } = await supabase
    .from('boutique_dresses')
    .select('id')
    .eq('dress_id', dressId)
    .in('boutique_id', boutiqueIds)
    .maybeSingle();

  return data !== null;
}

// Count occurrences of each boutique_dress_id in a swipe list
function countById(rows: Array<{ boutique_dress_id: unknown }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const id = row.boutique_dress_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

// ── Discovery routes (specific paths before /:boutiqueDressId) ──

// GET /api/dresses/feed
// Returns boutique_dresses not yet swiped by this user, with optional style_tag filter
router.get('/feed', auth, async (req, res) => {
  const { style_tags, limit } = req.query as { style_tags?: string; limit?: string };
  const pageLimit = Math.min(parseInt(limit ?? '20', 10), 50);

  // Step 1: IDs already swiped by this user
  const userId = req.user!.id;
  console.log(`[FEED] user_id: ${userId}`);

  const { data: swiped } = await supabase
    .from('user_swipes')
    .select('boutique_dress_id')
    .eq('user_id', userId);

  const excludeIds = (swiped ?? []).map((s) => (s as { boutique_dress_id: string }).boutique_dress_id);
  console.log(`[FEED] already-swiped count: ${excludeIds.length}`);

  // Step 2: Optional style_tag pre-filter — get matching dress IDs first
  let dressIdFilter: string[] | null = null;
  if (style_tags) {
    const tags = style_tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      const { data: matchingDresses } = await supabase
        .from('dresses')
        .select('id')
        .eq('is_deleted', false)
        .overlaps('style_tags', tags);

      dressIdFilter = (matchingDresses ?? []).map((d) => (d as { id: string }).id);
      if (dressIdFilter.length === 0) {
        res.json({ data: [], error: null });
        return;
      }
    }
  }

  // Step 3: Fetch feed
  let query = supabase
    .from('boutique_dresses')
    .select(BOUTIQUE_DRESS_LIST_SELECT)
    .eq('is_active', true)
    .limit(pageLimit);

  if (excludeIds.length > 0) {
    query = query.filter('id', 'not.in', `(${excludeIds.join(',')})`);
  }
  if (dressIdFilter) {
    query = query.in('dress_id', dressIdFilter);
  }

  const { data, error } = await query;
  console.log(`[FEED] query result — count: ${data?.length ?? 0}, error: ${error?.message ?? 'none'}`);

  if (error) {
    logger.error('GET /dresses/feed failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  // Filter out soft-deleted dresses
  const feed = (data ?? []).filter((bd) => {
    const d = (bd as { dresses?: { is_deleted?: boolean } }).dresses;
    return d && !d.is_deleted;
  });

  console.log(`[FEED] returning ${feed.length} dresses (after soft-delete filter)`);
  res.json({ data: feed, error: null });
});

// GET /api/dresses/explore
// Four curated sections: trending, top, new_arrivals, hot_deals
router.get('/explore', auth, async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Run independent queries in parallel
  const [
    { data: recentLikes },
    { data: allLikes },
    { data: newArrivals, error: naError },
    { data: hotDeals, error: hdError },
  ] = await Promise.all([
    supabase
      .from('user_swipes')
      .select('boutique_dress_id')
      .eq('direction', 'like')
      .gte('created_at', thirtyDaysAgo)
      .limit(5000),
    supabase
      .from('user_swipes')
      .select('boutique_dress_id')
      .eq('direction', 'like')
      .limit(10000),
    supabase
      .from('boutique_dresses')
      .select(BOUTIQUE_DRESS_LIST_SELECT)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('boutique_dresses')
      .select(BOUTIQUE_DRESS_LIST_SELECT)
      .eq('is_active', true)
      .eq('deal_active', true)
      .order('deal_percent', { ascending: false })
      .limit(10),
  ]);

  if (naError || hdError) {
    logger.error('GET /dresses/explore base query failed', naError ?? hdError);
    res.status(500).json({ data: null, error: 'Failed to load explore sections' });
    return;
  }

  // Derive top boutique_dress_ids from like counts
  const trendingCounts = countById(
    (recentLikes ?? []) as Array<{ boutique_dress_id: unknown }>
  );
  const topCounts = countById(
    (allLikes ?? []) as Array<{ boutique_dress_id: unknown }>
  );

  const topNIds = (counts: Map<string, number>, n: number): string[] =>
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([id]) => id);

  const trendingIds = topNIds(trendingCounts, 10);
  const topIds = topNIds(topCounts, 10);

  // Fetch boutique_dresses for trending and top in parallel
  const [{ data: trendingDresses }, { data: topDresses }] = await Promise.all([
    trendingIds.length > 0
      ? supabase
          .from('boutique_dresses')
          .select(BOUTIQUE_DRESS_LIST_SELECT)
          .in('id', trendingIds)
          .eq('is_active', true)
      : Promise.resolve({ data: [] }),
    topIds.length > 0
      ? supabase
          .from('boutique_dresses')
          .select(BOUTIQUE_DRESS_LIST_SELECT)
          .in('id', topIds)
          .eq('is_active', true)
      : Promise.resolve({ data: [] }),
  ]);

  res.json({
    data: {
      trending: trendingDresses ?? [],
      top: topDresses ?? [],
      new_arrivals: newArrivals ?? [],
      hot_deals: hotDeals ?? [],
    },
    error: null,
  });
});

// GET /api/dresses/search
// Full filter set across dress + boutique_dress attributes
router.get('/search', auth, async (req, res) => {
  const {
    style_tags,
    silhouette,
    fabric,
    event_types,
    color_name,
    available_sizes,
    price_range_min,
    price_range_max,
    deal_active,
    city,
    boutique_id,
  } = req.query as Record<string, string | undefined>;

  // Step 1: dress-level filters → get matching dress IDs
  const hasDressFilters = style_tags || silhouette || fabric || event_types || color_name;
  let dressIds: string[] | null = null;

  if (hasDressFilters) {
    let dressQuery = supabase.from('dresses').select('id').eq('is_deleted', false);

    if (silhouette) dressQuery = dressQuery.eq('silhouette', silhouette);
    if (color_name) dressQuery = dressQuery.ilike('color_name', `%${color_name}%`);
    if (style_tags) dressQuery = dressQuery.overlaps('style_tags', style_tags.split(','));
    if (fabric) dressQuery = dressQuery.overlaps('fabric', fabric.split(','));
    if (event_types) dressQuery = dressQuery.overlaps('event_types', event_types.split(','));

    const { data: matchedDresses, error: dressError } = await dressQuery;
    if (dressError) {
      logger.error('GET /dresses/search dress filter failed', dressError);
      res.status(500).json({ data: null, error: dressError.message });
      return;
    }

    dressIds = (matchedDresses ?? []).map((d) => (d as { id: string }).id);
    if (dressIds.length === 0) {
      res.json({ data: [], error: null });
      return;
    }
  }

  // Step 2: city filter → boutique IDs
  let boutiqueCityIds: string[] | null = null;
  if (city) {
    const { data: cityBoutiques } = await supabase
      .from('boutiques')
      .select('id')
      .ilike('city', `%${city}%`)
      .eq('status', 'active');

    boutiqueCityIds = (cityBoutiques ?? []).map((b) => (b as { id: string }).id);
    if (boutiqueCityIds.length === 0) {
      res.json({ data: [], error: null });
      return;
    }
  }

  // Step 3: boutique_dress query
  let query = supabase
    .from('boutique_dresses')
    .select(BOUTIQUE_DRESS_LIST_SELECT)
    .eq('is_active', true)
    .limit(50);

  if (dressIds) query = query.in('dress_id', dressIds);
  if (boutique_id) query = query.eq('boutique_id', boutique_id);
  if (boutiqueCityIds) query = query.in('boutique_id', boutiqueCityIds);
  if (deal_active === 'true') query = query.eq('deal_active', true);
  if (available_sizes) query = query.contains('available_sizes', [available_sizes]);
  if (price_range_min) query = query.gte('price_sale', Number(price_range_min));
  if (price_range_max) query = query.lte('price_sale', Number(price_range_max));

  const { data, error } = await query;

  if (error) {
    logger.error('GET /dresses/search bd query failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// GET /api/dresses/similar/:boutiqueDressId — must be before /:boutiqueDressId
router.get('/similar/:boutiqueDressId', auth, async (req, res) => {
  const { boutiqueDressId } = req.params as { boutiqueDressId: string };

  // Get source dress attributes
  const { data: source, error: sourceError } = await supabase
    .from('boutique_dresses')
    .select('dress_id, dresses(silhouette, style_tags)')
    .eq('id', boutiqueDressId)
    .single();

  if (sourceError || !source) {
    res.status(404).json({ data: null, error: 'Dress not found' });
    return;
  }

  const sourceDress = (source as { dress_id: string; dresses: { silhouette?: string; style_tags?: string[] } }).dresses;
  const { silhouette, style_tags } = sourceDress ?? {};
  const sourceDressId = (source as { dress_id: string }).dress_id;

  // Build OR filter for matching dresses
  const orParts: string[] = [];
  if (silhouette) {
    // Quote value to handle spaces (e.g. "Ball Gown")
    orParts.push(`silhouette.eq."${silhouette.replace(/"/g, '\\"')}"`);
  }
  if (style_tags && style_tags.length > 0) {
    orParts.push(`style_tags.ov.{${style_tags.join(',')}}`);
  }

  if (orParts.length === 0) {
    res.json({ data: [], error: null });
    return;
  }

  const { data: similarDresses, error: similarError } = await supabase
    .from('dresses')
    .select('id')
    .eq('is_deleted', false)
    .neq('id', sourceDressId)
    .or(orParts.join(','))
    .limit(20);

  if (similarError) {
    logger.error('GET /dresses/similar: dress query failed', similarError);
    res.status(500).json({ data: null, error: similarError.message });
    return;
  }

  const similarDressIds = (similarDresses ?? []).map((d) => (d as { id: string }).id);

  if (similarDressIds.length === 0) {
    res.json({ data: [], error: null });
    return;
  }

  const { data, error } = await supabase
    .from('boutique_dresses')
    .select(BOUTIQUE_DRESS_LIST_SELECT)
    .in('dress_id', similarDressIds)
    .eq('is_active', true)
    .limit(10);

  if (error) {
    logger.error('GET /dresses/similar: bd query failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// ── Single dress detail ──────────────────────────────────────

// GET /api/dresses/:boutiqueDressId — full detail
router.get('/:boutiqueDressId', auth, async (req, res) => {
  const { boutiqueDressId } = req.params as { boutiqueDressId: string };

  const { data, error } = await supabase
    .from('boutique_dresses')
    .select(`
      *,
      dresses(
        *,
        dress_photos(id, path, sort_order, is_tryon_eligible)
      ),
      boutiques(
        id, name, city, logo_path, phone, zalo, instagram, facebook,
        boutique_packages(id, name, description, price, currency, includes)
      )
    `)
    .eq('id', boutiqueDressId)
    .eq('is_active', true)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    res.status(status).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// ── Boutique write routes (boutique role required) ────────────

// POST /api/dresses — create dress + boutique_dress record
router.post('/', auth, requireRole('boutique'), async (req, res) => {
  const {
    boutique_id,
    title,
    subtitle,
    long_description,
    designer,
    silhouette,
    neckline,
    sleeve,
    back_style,
    length,
    train,
    color_name,
    color_code,
    fabric,
    details,
    style_tags,
    event_types,
    condition,
    availability,
    additional_services,
    sku,
    price_sale,
    price_original,
    price_rental,
    price_currency,
    price_visible,
    available_sizes,
  } = req.body as {
    boutique_id?: string;
    title?: string;
    subtitle?: string;
    long_description?: string;
    designer?: string;
    silhouette?: string;
    neckline?: string;
    sleeve?: string;
    back_style?: string;
    length?: string;
    train?: string;
    color_name?: string;
    color_code?: string;
    fabric?: string[];
    details?: string[];
    style_tags?: string[];
    event_types?: string[];
    condition?: string;
    availability?: string;
    additional_services?: string[];
    sku?: string;
    price_sale?: number;
    price_original?: number;
    price_rental?: number;
    price_currency?: string;
    price_visible?: boolean;
    available_sizes?: string[];
  };

  if (!boutique_id || !title) {
    res.status(400).json({ data: null, error: 'boutique_id and title are required' });
    return;
  }

  // Verify user owns this boutique
  const { data: boutique } = await supabase
    .from('boutiques')
    .select('id')
    .eq('id', boutique_id)
    .eq('owner_user_id', req.user!.id)
    .maybeSingle();

  if (!boutique) {
    res.status(403).json({ data: null, error: 'Forbidden — boutique not owned by you' });
    return;
  }

  // Create dress
  const { data: dress, error: dressError } = await supabase
    .from('dresses')
    .insert({
      title,
      subtitle,
      long_description,
      designer,
      silhouette,
      neckline,
      sleeve,
      back_style,
      length,
      train,
      color_name,
      color_code,
      fabric,
      details,
      style_tags,
      event_types,
      condition,
      availability,
      additional_services,
      consent_confirmed: true,
    })
    .select()
    .single();

  if (dressError) {
    logger.error('POST /dresses: dress insert failed', dressError);
    res.status(500).json({ data: null, error: dressError.message });
    return;
  }

  const dressId = (dress as { id: string }).id;

  // Link dress to boutique
  const { data: boutiqueDress, error: bdError } = await supabase
    .from('boutique_dresses')
    .insert({
      dress_id: dressId,
      boutique_id,
      sku,
      price_sale,
      price_original,
      price_rental,
      price_currency: price_currency ?? 'VND',
      price_visible: price_visible ?? true,
      available_sizes,
    })
    .select()
    .single();

  if (bdError) {
    logger.error('POST /dresses: boutique_dress insert failed', bdError);
    // Dress was already created — log but return what we have
    res.status(500).json({ data: null, error: bdError.message });
    return;
  }

  logger.info(`Dress created: ${dressId} for boutique ${boutique_id}`);
  res.status(201).json({ data: { dress, boutique_dress: boutiqueDress }, error: null });
});

// PUT /api/dresses/:id — update dress fields (boutique owner)
router.put('/:id', auth, requireRole('boutique'), async (req, res) => {
  const { id } = req.params as { id: string };

  if (!(await verifyDressOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const {
    title,
    subtitle,
    long_description,
    designer,
    silhouette,
    neckline,
    sleeve,
    back_style,
    length,
    train,
    color_name,
    color_code,
    fabric,
    details,
    style_tags,
    event_types,
    condition,
    availability,
    additional_services,
  } = req.body as Record<string, unknown>;

  const { data, error } = await supabase
    .from('dresses')
    .update({
      title,
      subtitle,
      long_description,
      designer,
      silhouette,
      neckline,
      sleeve,
      back_style,
      length,
      train,
      color_name,
      color_code,
      fabric,
      details,
      style_tags,
      event_types,
      condition,
      availability,
      additional_services,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('PUT /dresses/:id failed', error);
    res.status(error.code === 'PGRST116' ? 404 : 500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// POST /api/dresses/:id/photos — add photos (boutique owner)
router.post('/:id/photos', auth, requireRole('boutique'), async (req, res) => {
  const { id } = req.params as { id: string };

  if (!(await verifyDressOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { photos } = req.body as {
    photos?: Array<{ path: string; sort_order?: number; is_tryon_eligible?: boolean }>;
  };

  if (!photos || photos.length === 0) {
    res.status(400).json({ data: null, error: 'photos array is required' });
    return;
  }

  const rows = photos.map((p) => ({
    dress_id: id,
    path: p.path,
    sort_order: p.sort_order ?? 0,
    is_tryon_eligible: p.is_tryon_eligible ?? false,
  }));

  const { data, error } = await supabase.from('dress_photos').insert(rows).select();

  if (error) {
    logger.error('POST /dresses/:id/photos failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

// DELETE /api/dresses/:id/photos/:photoId — remove a photo (boutique owner)
router.delete('/:id/photos/:photoId', auth, requireRole('boutique'), async (req, res) => {
  const { id, photoId } = req.params as { id: string; photoId: string };

  if (!(await verifyDressOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { error } = await supabase
    .from('dress_photos')
    .delete()
    .eq('id', photoId)
    .eq('dress_id', id);

  if (error) {
    logger.error('DELETE /dresses/:id/photos/:photoId failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data: { photo_id: photoId }, error: null });
});

export default router;
