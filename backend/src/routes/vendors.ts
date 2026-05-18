import { Router } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { auth } from '../middleware/auth';
import { uploadBase64File } from '../services/storageService';

const router = Router();

function makeVendorSlug(name: string, userId: string): string {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${userId.slice(0, 8)}`;
}

async function verifyVendorOwnership(vendorId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', vendorId)
    .eq('owner_user_id', userId)
    .maybeSingle();
  return data !== null;
}

// POST /api/vendors — create vendor profile
router.post('/', auth, async (req, res) => {
  const {
    name,
    description,
    city,
    country,
    phone,
    zalo,
    email,
    website,
    instagram,
    facebook,
    tiktok,
    specialty_tags,
  } = req.body as {
    name?: string;
    description?: string;
    city?: string;
    country?: string;
    phone?: string;
    zalo?: string;
    email?: string;
    website?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    specialty_tags?: string[];
  };

  if (!name) {
    res.status(400).json({ data: null, error: 'name is required' });
    return;
  }

  const slug = makeVendorSlug(name, req.user!.id);

  const { data, error } = await supabase
    .from('vendors')
    .insert({
      owner_user_id: req.user!.id,
      name,
      slug,
      description: description ?? null,
      city: city ?? null,
      country: country ?? 'VN',
      phone: phone ?? null,
      zalo: zalo ?? null,
      email: email ?? null,
      website: website ?? null,
      instagram: instagram ?? null,
      facebook: facebook ?? null,
      tiktok: tiktok ?? null,
      specialty_tags: specialty_tags ?? [],
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    logger.error('POST /vendors: insert failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  logger.info(`Vendor created: ${(data as { id: string }).id} by user ${req.user!.id}`);
  res.status(201).json({ data, error: null });
});

// PUT /api/vendors/:id — update vendor profile
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  if (!(await verifyVendorOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const {
    name,
    description,
    city,
    country,
    phone,
    zalo,
    email,
    website,
    instagram,
    facebook,
    tiktok,
    specialty_tags,
  } = req.body as {
    name?: string;
    description?: string;
    city?: string;
    country?: string;
    phone?: string;
    zalo?: string;
    email?: string;
    website?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    specialty_tags?: string[];
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (city !== undefined) updates.city = city;
  if (country !== undefined) updates.country = country;
  if (phone !== undefined) updates.phone = phone;
  if (zalo !== undefined) updates.zalo = zalo;
  if (email !== undefined) updates.email = email;
  if (website !== undefined) updates.website = website;
  if (instagram !== undefined) updates.instagram = instagram;
  if (facebook !== undefined) updates.facebook = facebook;
  if (tiktok !== undefined) updates.tiktok = tiktok;
  if (specialty_tags !== undefined) updates.specialty_tags = specialty_tags;

  const { data, error } = await supabase
    .from('vendors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('PUT /vendors/:id: update failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// POST /api/vendors/:id/listings — create listing
router.post('/:id/listings', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  if (!(await verifyVendorOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { category_id, title, description, city, attributes } = req.body as {
    category_id?: string;
    title?: string;
    description?: string;
    city?: string;
    attributes?: Record<string, unknown>;
  };

  if (!category_id || !title) {
    res.status(400).json({ data: null, error: 'category_id and title are required' });
    return;
  }

  const { data, error } = await supabase
    .from('vendor_listings')
    .insert({
      vendor_id: id,
      category_id,
      title,
      description: description ?? null,
      city: city ?? null,
      attributes: attributes ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error('POST /vendors/:id/listings: insert failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

// PUT /api/vendors/:id/listings/:listingId — update listing
router.put('/:id/listings/:listingId', auth, async (req, res) => {
  const { id, listingId } = req.params as { id: string; listingId: string };

  if (!(await verifyVendorOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { category_id, title, description, city, attributes, is_active } = req.body as {
    category_id?: string;
    title?: string;
    description?: string;
    city?: string;
    attributes?: Record<string, unknown>;
    is_active?: boolean;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (category_id !== undefined) updates.category_id = category_id;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (city !== undefined) updates.city = city;
  if (attributes !== undefined) updates.attributes = attributes;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('vendor_listings')
    .update(updates)
    .eq('id', listingId)
    .eq('vendor_id', id)
    .select()
    .single();

  if (error) {
    logger.error('PUT /vendors/:id/listings/:listingId: update failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// DELETE /api/vendors/:id/listings/:listingId — soft-deactivate listing
router.delete('/:id/listings/:listingId', auth, async (req, res) => {
  const { id, listingId } = req.params as { id: string; listingId: string };

  if (!(await verifyVendorOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { data, error } = await supabase
    .from('vendor_listings')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('vendor_id', id)
    .select()
    .single();

  if (error) {
    logger.error('DELETE /vendors/:id/listings/:listingId: deactivate failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// POST /api/vendors/:id/listings/:listingId/photos — upload photo to vendor-photos bucket
router.post('/:id/listings/:listingId/photos', auth, async (req, res) => {
  const { id, listingId } = req.params as { id: string; listingId: string };

  if (!(await verifyVendorOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { image_base64, is_cover = false, sort_order = 0 } = req.body as {
    image_base64?: string;
    is_cover?: boolean;
    sort_order?: number;
  };

  if (!image_base64) {
    res.status(400).json({ data: null, error: 'image_base64 is required' });
    return;
  }

  const storagePath = `listings/${listingId}/${randomUUID()}.jpg`;

  try {
    await uploadBase64File('vendor-photos', storagePath, image_base64, 'image/jpeg');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('POST /vendors/:id/listings/:listingId/photos: upload failed', err);
    res.status(500).json({ data: null, error: message });
    return;
  }

  const { data, error } = await supabase
    .from('vendor_listing_photos')
    .insert({ listing_id: listingId, path: storagePath, sort_order, is_cover })
    .select()
    .single();

  if (error) {
    logger.error('POST /vendors/:id/listings/:listingId/photos: db insert failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

export default router;
