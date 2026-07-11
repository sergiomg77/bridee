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

// GET /api/vendors/me — return vendor profile owned by authenticated user
router.get('/me', auth, async (req, res) => {
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('*')
    .eq('owner_user_id', req.user!.id)
    .maybeSingle();

  if (vendorError) {
    logger.error('GET /vendors/me: query failed', vendorError);
    res.status(500).json({ data: null, error: vendorError.message });
    return;
  }

  if (!vendor) {
    res.status(404).json({ data: null, error: 'No vendor profile found' });
    return;
  }

  const vendorId = (vendor as Record<string, unknown> & { id: string }).id;

  const { data: listings, error: listingsError } = await supabase
    .from('vendor_listings')
    .select(`
      *,
      vendor_listing_photos ( * ),
      vendor_packages ( * )
    `)
    .eq('vendor_id', vendorId);

  if (listingsError) {
    logger.error('GET /vendors/me: listings query failed', listingsError);
    res.status(500).json({ data: null, error: listingsError.message });
    return;
  }

  res.json({ data: { ...(vendor as Record<string, unknown>), listings }, error: null });
});

// GET /api/vendors/:id/listings — return all listings with photos and active packages
router.get('/:id/listings', auth, async (req, res) => {
  const { id } = req.params as { id: string };

  if (!(await verifyVendorOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { data: listings, error: listingsError } = await supabase
    .from('vendor_listings')
    .select('*')
    .eq('vendor_id', id);

  if (listingsError) {
    logger.error('GET /vendors/:id/listings: query failed', listingsError);
    res.status(500).json({ data: null, error: listingsError.message });
    return;
  }

  const listingsTyped = (listings ?? []) as Array<Record<string, unknown> & { id: string }>;

  if (listingsTyped.length === 0) {
    res.json({ data: [], error: null });
    return;
  }

  const listingIds = listingsTyped.map((l) => l.id);

  const [photosResult, packagesResult] = await Promise.all([
    supabase
      .from('vendor_listing_photos')
      .select('*')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true }),
    supabase
      .from('vendor_packages')
      .select('*')
      .in('listing_id', listingIds)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (photosResult.error) {
    logger.error('GET /vendors/:id/listings: photos query failed', photosResult.error);
    res.status(500).json({ data: null, error: photosResult.error.message });
    return;
  }

  if (packagesResult.error) {
    logger.error('GET /vendors/:id/listings: packages query failed', packagesResult.error);
    res.status(500).json({ data: null, error: packagesResult.error.message });
    return;
  }

  const photos = (photosResult.data ?? []) as Array<Record<string, unknown> & { listing_id: string }>;
  const packages = (packagesResult.data ?? []) as Array<Record<string, unknown> & { listing_id: string }>;

  const data = listingsTyped.map((listing) => ({
    ...listing,
    vendor_listing_photos: photos.filter((p) => p.listing_id === listing.id),
    vendor_packages: packages.filter((p) => p.listing_id === listing.id),
  }));

  res.json({ data, error: null });
});

// POST /api/vendors/:id/listings/:listingId/packages — create a package
router.post('/:id/listings/:listingId/packages', auth, async (req, res) => {
  const { id, listingId } = req.params as { id: string; listingId: string };

  if (!(await verifyVendorOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const {
    name,
    pricing_model,
    description,
    price,
    price_currency = 'VND',
    sort_order = 0,
  } = req.body as {
    name?: string;
    pricing_model?: 'fixed' | 'per_hour' | 'quote';
    description?: string;
    price?: number | null;
    price_currency?: string;
    sort_order?: number;
  };

  if (!name || !pricing_model) {
    res.status(400).json({ data: null, error: 'name and pricing_model are required' });
    return;
  }

  if (!['fixed', 'per_hour', 'quote'].includes(pricing_model)) {
    res.status(400).json({ data: null, error: 'pricing_model must be one of: fixed, per_hour, quote' });
    return;
  }

  const { data, error } = await supabase
    .from('vendor_packages')
    .insert({
      listing_id: listingId,
      name,
      pricing_model,
      description: description ?? null,
      price: pricing_model === 'quote' ? null : (price ?? null),
      price_currency,
      sort_order,
    })
    .select()
    .single();

  if (error) {
    logger.error('POST /vendors/:id/listings/:listingId/packages: insert failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.status(201).json({ data, error: null });
});

// PUT /api/vendors/:id/listings/:listingId/packages/:packageId — update a package
router.put('/:id/listings/:listingId/packages/:packageId', auth, async (req, res) => {
  const { id, listingId, packageId } = req.params as {
    id: string;
    listingId: string;
    packageId: string;
  };

  if (!(await verifyVendorOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const {
    name,
    description,
    pricing_model,
    price,
    price_currency,
    sort_order,
    is_active,
  } = req.body as {
    name?: string;
    description?: string;
    pricing_model?: 'fixed' | 'per_hour' | 'quote';
    price?: number | null;
    price_currency?: string;
    sort_order?: number;
    is_active?: boolean;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (pricing_model !== undefined) updates.pricing_model = pricing_model;
  if (price !== undefined) updates.price = price;
  if (price_currency !== undefined) updates.price_currency = price_currency;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('vendor_packages')
    .update(updates)
    .eq('id', packageId)
    .eq('listing_id', listingId)
    .select()
    .single();

  if (error) {
    logger.error('PUT /vendors/:id/listings/:listingId/packages/:packageId: update failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

// DELETE /api/vendors/:id/listings/:listingId/packages/:packageId — soft-deactivate a package
router.delete('/:id/listings/:listingId/packages/:packageId', auth, async (req, res) => {
  const { id, listingId, packageId } = req.params as {
    id: string;
    listingId: string;
    packageId: string;
  };

  if (!(await verifyVendorOwnership(id, req.user!.id))) {
    res.status(403).json({ data: null, error: 'Forbidden' });
    return;
  }

  const { data, error } = await supabase
    .from('vendor_packages')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', packageId)
    .eq('listing_id', listingId)
    .select()
    .single();

  if (error) {
    logger.error('DELETE /vendors/:id/listings/:listingId/packages/:packageId: deactivate failed', error);
    res.status(500).json({ data: null, error: error.message });
    return;
  }

  res.json({ data, error: null });
});

export default router;
