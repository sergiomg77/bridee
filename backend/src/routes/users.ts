import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { auth } from '../middleware/auth';

const router = Router();

// GET /api/users/profile
router.get('/profile', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user!.id)
    .maybeSingle();

  if (error) {
    logger.error('GET /users/profile failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// PUT /api/users/profile
router.put('/profile', auth, async (req, res) => {
  const {
    full_name,
    avatar_path,
    phone,
    language,
    currency,
    city,
    budget_min,
    budget_max,
    style_preferences,
  } = req.body as {
    full_name?: string;
    avatar_path?: string;
    phone?: string;
    language?: string;
    currency?: string;
    city?: string;
    budget_min?: number;
    budget_max?: number;
    style_preferences?: string[];
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: req.user!.id,
      full_name,
      avatar_path,
      phone,
      language,
      currency,
      city,
      budget_min,
      budget_max,
      style_preferences,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error('PUT /users/profile failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// GET /api/users/roles
router.get('/roles', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id, role, created_at')
    .eq('user_id', req.user!.id);

  if (error) {
    logger.error('GET /users/roles failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// POST /api/users/roles
router.post('/roles', auth, async (req, res) => {
  const { role } = req.body as { role?: string };
  const allowed = ['boutique', 'vendor'];

  if (!role || !allowed.includes(role)) {
    res.status(400).json({ data: null, error: `role must be one of: ${allowed.join(', ')}` });
    return;
  }

  const { data, error } = await supabase
    .from('user_roles')
    .insert({ user_id: req.user!.id, role })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ data: null, error: 'Role already assigned' });
      return;
    }
    logger.error('POST /users/roles failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

// POST /api/users/promo
router.post('/promo', auth, async (req, res) => {
  const { code } = req.body as { code?: string };

  if (!code) {
    res.status(400).json({ data: null, error: 'code is required' });
    return;
  }

  const { data: promo, error: promoError } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (promoError) {
    logger.error('promo lookup failed', promoError);
    res.status(500).json({ data: null, error: promoError.message });
    return;
  }

  if (!promo) {
    res.status(404).json({ data: null, error: 'Promo code not found or inactive' });
    return;
  }

  if (promo.expires_at && new Date(promo.expires_at as string) < new Date()) {
    res.status(400).json({ data: null, error: 'Promo code has expired' });
    return;
  }

  if (promo.max_uses !== null && (promo.used_count as number) >= (promo.max_uses as number)) {
    res.status(400).json({ data: null, error: 'Promo code has reached its usage limit' });
    return;
  }

  const { data: existing } = await supabase
    .from('user_promo_redemptions')
    .select('id')
    .eq('user_id', req.user!.id)
    .eq('promo_code_id', promo.id as string)
    .maybeSingle();

  if (existing) {
    res.status(400).json({ data: null, error: 'Promo code already redeemed' });
    return;
  }

  const { error: insertError } = await supabase
    .from('user_promo_redemptions')
    .insert({ user_id: req.user!.id, promo_code_id: promo.id });

  if (insertError) {
    logger.error('promo redemption insert failed', insertError);
    res.status(500).json({ data: null, error: insertError.message });
    return;
  }

  // Best-effort increment — don't fail the request if this update fails
  const { error: updateError } = await supabase
    .from('promo_codes')
    .update({ used_count: (promo.used_count as number) + 1, updated_at: new Date().toISOString() })
    .eq('id', promo.id as string);

  if (updateError) {
    logger.warn('promo used_count increment failed', updateError);
  }

  res.json({
    data: {
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
    },
    error: null,
  });
});

export default router;
