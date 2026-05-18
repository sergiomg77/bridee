import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { auth } from '../middleware/auth';

const router = Router();

// GET /api/marketplace/categories
router.get('/categories', async (_req, res) => {
  const { data, error } = await supabase
    .from('marketplace_categories')
    .select('id, name, slug, icon_name, sort_order, filter_config')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error('GET /marketplace/categories failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// GET /api/marketplace/listings
// query params: category_id, city, attributes (JSON string), page, limit
router.get('/listings', async (req, res) => {
  const { category_id, city, attributes, page = '1', limit = '20' } =
    req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, parseInt(limit, 10) || 20);
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  // Only show listings from active vendors
  const { data: activeVendors } = await supabase
    .from('vendors')
    .select('id')
    .eq('status', 'active');

  const activeVendorIds = ((activeVendors ?? []) as Array<{ id: string }>).map((v) => v.id);

  if (activeVendorIds.length === 0) {
    res.json({ data: [], error: null, meta: { total: 0, page: pageNum, limit: pageSize } });
    return;
  }

  let query = supabase
    .from('vendor_listings')
    .select(
      `
      id, vendor_id, category_id, title, description, city, attributes, is_active, created_at,
      vendors(id, name, slug, city, logo_path, status),
      marketplace_categories(id, name, slug),
      vendor_listing_photos(id, path, sort_order, is_cover),
      vendor_packages(id, name, pricing_model, price, price_currency, is_active)
    `,
      { count: 'exact' }
    )
    .eq('is_active', true)
    .in('vendor_id', activeVendorIds)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (category_id) query = query.eq('category_id', category_id);
  if (city) query = query.ilike('city', `%${city}%`);

  if (attributes) {
    try {
      const attributeFilter = JSON.parse(attributes) as unknown;
      if (typeof attributeFilter === 'object' && attributeFilter !== null) {
        query = query.contains('attributes', attributeFilter as Record<string, unknown>);
      }
    } catch {
      res.status(400).json({ data: null, error: 'attributes must be valid JSON' });
      return;
    }
  }

  const { data, error, count } = await query;

  if (error) {
    logger.error('GET /marketplace/listings failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null, meta: { total: count, page: pageNum, limit: pageSize } });
});

// GET /api/marketplace/listings/:id
router.get('/listings/:id', async (req, res) => {
  const { id } = req.params as { id: string };

  const { data, error } = await supabase
    .from('vendor_listings')
    .select(`
      id, vendor_id, category_id, title, description, city, attributes, is_active, created_at, updated_at,
      vendors(id, name, slug, description, city, country, phone, zalo, email, website, instagram, facebook, tiktok, logo_path, specialty_tags, status),
      marketplace_categories(id, name, slug, filter_config),
      vendor_listing_photos(id, path, sort_order, is_cover),
      vendor_packages(id, name, description, pricing_model, price, price_currency, sort_order, is_active)
    `)
    .eq('id', id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    res.status(status).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// POST /api/marketplace/listings/:id/save
router.post('/listings/:id/save', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  const { error } = await supabase
    .from('user_saved_listings')
    .insert({ user_id: req.user!.id, listing_id: id });

  if (error) {
    if (error.code === '23505') {
      res.json({ data: { saved: true }, error: null });
      return;
    }
    logger.error('POST /marketplace/listings/:id/save failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data: { saved: true }, error: null });
});

// DELETE /api/marketplace/listings/:id/save
router.delete('/listings/:id/save', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  const { error } = await supabase
    .from('user_saved_listings')
    .delete()
    .eq('user_id', req.user!.id)
    .eq('listing_id', id);

  if (error) {
    logger.error('DELETE /marketplace/listings/:id/save failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data: { saved: false }, error: null });
});

// GET /api/marketplace/saved
router.get('/saved', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('user_saved_listings')
    .select(`
      id, created_at,
      vendor_listings(
        id, title, description, city,
        vendors(id, name, slug, logo_path),
        marketplace_categories(id, name, slug),
        vendor_listing_photos(id, path, sort_order, is_cover)
      )
    `)
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /marketplace/saved failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// GET /api/marketplace/vendors/:id — public vendor profile with listings + review summary
router.get('/vendors/:id', async (req, res) => {
  const { id } = req.params as { id: string };

  const [vendorResult, reviewResult] = await Promise.all([
    supabase
      .from('vendors')
      .select(`
        id, name, slug, description, city, country, phone, zalo, email, website,
        instagram, facebook, tiktok, logo_path, specialty_tags, status, created_at,
        vendor_listings(
          id, title, description, city, is_active,
          marketplace_categories(id, name, slug),
          vendor_listing_photos(id, path, sort_order, is_cover),
          vendor_packages(id, name, pricing_model, price, price_currency, is_active)
        )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('vendor_reviews')
      .select('id, user_id, listing_id, rating, body, created_at')
      .eq('vendor_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (vendorResult.error) {
    const status = vendorResult.error.code === 'PGRST116' ? 404 : 500;
    res.status(status).json({ data: null, error: vendorResult.error.message });
    return;
  }

  if (reviewResult.error) {
    logger.error('GET /marketplace/vendors/:id: reviews fetch failed', reviewResult.error);
  }

  const reviews = (reviewResult.data ?? []) as Array<{ rating: number }>;
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  res.json({
    data: {
      ...vendorResult.data,
      reviews: reviewResult.data ?? [],
      review_count: reviews.length,
      avg_rating: avgRating,
    },
    error: null,
  });
});

// POST /api/marketplace/vendors/:id/reviews
router.post('/vendors/:id/reviews', auth, async (req, res) => {
  const { id } = req.params as { id: string };
  const { listing_id, rating, body } = req.body as {
    listing_id?: string;
    rating?: number;
    body?: string;
  };

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ data: null, error: 'rating must be between 1 and 5' });
    return;
  }

  const { data, error } = await supabase
    .from('vendor_reviews')
    .insert({
      user_id: req.user!.id,
      vendor_id: id,
      listing_id: listing_id ?? null,
      rating,
      body: body ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error('POST /marketplace/vendors/:id/reviews failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

// GET /api/marketplace/vendors/:id/reviews
router.get('/vendors/:id/reviews', async (req, res) => {
  const { id } = req.params as { id: string };

  const { data, error } = await supabase
    .from('vendor_reviews')
    .select('id, user_id, listing_id, rating, body, created_at')
    .eq('vendor_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /marketplace/vendors/:id/reviews failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

export default router;
