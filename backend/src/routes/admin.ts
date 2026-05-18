import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

async function getUserEmailMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const map = new Map<string, string>();
  for (const user of data.users) {
    map.set(user.id, user.email ?? '');
  }
  return map;
}

// ── Boutiques ─────────────────────────────────────────────────

// GET /api/admin/boutiques
router.get('/boutiques', adminOnly, async (_req, res) => {
  const { data, error } = await supabase
    .from('boutiques')
    .select('id, name, city, status, owner_user_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /admin/boutiques failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  let emailMap: Map<string, string>;
  try {
    emailMap = await getUserEmailMap();
  } catch (err) {
    logger.error('GET /admin/boutiques: auth.admin.listUsers failed', err);
    res.status(500).json({ data: null, error: 'Failed to fetch user emails' });
    return;
  }

  const enriched = (data as Array<Record<string, unknown>>).map((b) => ({
    ...b,
    owner_email: emailMap.get(b.owner_user_id as string) ?? null,
  }));

  res.json({ data: enriched, error: null });
});

// PATCH /api/admin/boutiques/:id/status
router.patch('/boutiques/:id/status', adminOnly, async (req, res) => {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status?: string };

  if (!status || !['pending', 'active', 'suspended'].includes(status)) {
    res.status(400).json({ data: null, error: 'status must be pending, active, or suspended' });
    return;
  }

  const { data, error } = await supabase
    .from('boutiques')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('PATCH /admin/boutiques/:id/status failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  logger.info(`Admin set boutique ${id} → ${status}`);
  res.json({ data, error: null });
});

// ── Vendors ───────────────────────────────────────────────────

// GET /api/admin/vendors
router.get('/vendors', adminOnly, async (_req, res) => {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, city, status, owner_user_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /admin/vendors failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  let emailMap: Map<string, string>;
  try {
    emailMap = await getUserEmailMap();
  } catch (err) {
    logger.error('GET /admin/vendors: auth.admin.listUsers failed', err);
    res.status(500).json({ data: null, error: 'Failed to fetch user emails' });
    return;
  }

  const enriched = (data as Array<Record<string, unknown>>).map((v) => ({
    ...v,
    owner_email: emailMap.get(v.owner_user_id as string) ?? null,
  }));

  res.json({ data: enriched, error: null });
});

// PATCH /api/admin/vendors/:id/status
router.patch('/vendors/:id/status', adminOnly, async (req, res) => {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status?: string };

  if (!status || !['pending', 'active', 'suspended'].includes(status)) {
    res.status(400).json({ data: null, error: 'status must be pending, active, or suspended' });
    return;
  }

  const { data, error } = await supabase
    .from('vendors')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('PATCH /admin/vendors/:id/status failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  logger.info(`Admin set vendor ${id} → ${status}`);
  res.json({ data, error: null });
});

// ── Users ─────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', adminOnly, async (_req, res) => {
  let allUsers: Array<{ id: string; email?: string; created_at: string }> = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      logger.error('GET /admin/users: auth.admin.listUsers failed', error);
      res.status(500).json({ data: null, error: error.message });
      return;
    }
    allUsers = allUsers.concat(
      data.users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at }))
    );
    if (data.users.length < 1000) break;
    page++;
  }

  res.json({ data: allUsers, error: null });
});

// ── Marketplace Categories ────────────────────────────────────

// GET /api/admin/categories
router.get('/categories', adminOnly, async (_req, res) => {
  const { data, error } = await supabase
    .from('marketplace_categories')
    .select('id, name, slug, icon_name, sort_order, is_active, filter_config, created_at, updated_at')
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error('GET /admin/categories failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// POST /api/admin/categories
router.post('/categories', adminOnly, async (req, res) => {
  const { name, slug, icon_name, sort_order, is_active, filter_config } = req.body as {
    name?: string;
    slug?: string;
    icon_name?: string;
    sort_order?: number;
    is_active?: boolean;
    filter_config?: Record<string, unknown>;
  };

  if (!name || !slug) {
    res.status(400).json({ data: null, error: 'name and slug are required' });
    return;
  }

  const { data, error } = await supabase
    .from('marketplace_categories')
    .insert({
      name,
      slug,
      icon_name: icon_name ?? null,
      sort_order: sort_order ?? 0,
      is_active: is_active ?? true,
      filter_config: filter_config ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error('POST /admin/categories: insert failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

// PATCH /api/admin/categories/:id
router.patch('/categories/:id', adminOnly, async (req, res) => {
  const { id } = req.params as { id: string };
  const { name, slug, icon_name, sort_order, is_active, filter_config } = req.body as {
    name?: string;
    slug?: string;
    icon_name?: string;
    sort_order?: number;
    is_active?: boolean;
    filter_config?: Record<string, unknown>;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (icon_name !== undefined) updates.icon_name = icon_name;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (is_active !== undefined) updates.is_active = is_active;
  if (filter_config !== undefined) updates.filter_config = filter_config;

  const { data, error } = await supabase
    .from('marketplace_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('PATCH /admin/categories/:id failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// ── Promo Codes ───────────────────────────────────────────────

// GET /api/admin/promo-codes
router.get('/promo-codes', adminOnly, async (_req, res) => {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('id, code, discount_type, discount_value, max_uses, used_count, expires_at, is_active, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /admin/promo-codes failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// POST /api/admin/promo-codes
router.post('/promo-codes', adminOnly, async (req, res) => {
  const { code, discount_type, discount_value, max_uses, expires_at, is_active } = req.body as {
    code?: string;
    discount_type?: string;
    discount_value?: number;
    max_uses?: number;
    expires_at?: string;
    is_active?: boolean;
  };

  if (!code || !discount_type || discount_value === undefined) {
    res.status(400).json({ data: null, error: 'code, discount_type, and discount_value are required' });
    return;
  }

  if (!['percent', 'fixed'].includes(discount_type)) {
    res.status(400).json({ data: null, error: 'discount_type must be percent or fixed' });
    return;
  }

  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      code: code.toUpperCase(),
      discount_type,
      discount_value,
      max_uses: max_uses ?? null,
      expires_at: expires_at ?? null,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    logger.error('POST /admin/promo-codes: insert failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

// PATCH /api/admin/promo-codes/:id
router.patch('/promo-codes/:id', adminOnly, async (req, res) => {
  const { id } = req.params as { id: string };
  const { discount_value, max_uses, expires_at, is_active } = req.body as {
    discount_value?: number;
    max_uses?: number;
    expires_at?: string | null;
    is_active?: boolean;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (discount_value !== undefined) updates.discount_value = discount_value;
  if (max_uses !== undefined) updates.max_uses = max_uses;
  if (expires_at !== undefined) updates.expires_at = expires_at;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('promo_codes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('PATCH /admin/promo-codes/:id failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

export default router;
