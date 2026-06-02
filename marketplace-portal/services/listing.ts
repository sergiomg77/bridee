import { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ListingFormData {
  title: string;
  description?: string;
  city?: string;
  category_id: string;
  attributes?: Record<string, unknown>;
}

export interface PackageFormData {
  name: string;
  description?: string;
  pricing_model: 'fixed' | 'per_hour' | 'quote';
  price?: number | null;
  price_currency?: string;
  sort_order?: number;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  path: string;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface VendorPackage {
  id: string;
  listing_id: string;
  name: string;
  description: string | null;
  pricing_model: string;
  price: number | null;
  price_currency: string;
  sort_order: number;
  is_active: boolean;
}

export interface ListingRow {
  id: string;
  vendor_id: string;
  category_id: string;
  title: string;
  description: string | null;
  city: string | null;
  attributes: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  cover_photo: ListingPhoto | null;
  photo_count: number;
  category_name: string | null;
}

export interface FullListing {
  id: string;
  vendor_id: string;
  category_id: string;
  title: string;
  description: string | null;
  city: string | null;
  attributes: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  vendor_listing_photos: ListingPhoto[];
  vendor_packages: VendorPackage[];
  category_name: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractCategory(raw: unknown): { id: string; name: string } | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as { id: string; name: string } | undefined) ?? null;
  return raw as { id: string; name: string };
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function fetchVendorListings(
  supabase: SupabaseClient,
  vendorId: string
): Promise<{ data: ListingRow[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('vendor_listings')
    .select(`
      id, vendor_id, category_id, title, description, city, attributes, is_active, created_at,
      vendor_listing_photos ( id, listing_id, path, sort_order, is_cover, created_at ),
      marketplace_categories ( id, name )
    `)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

if (error) {
  logger.error('fetchVendorListings: query failed', { message: error.message, code: error.code, details: error.details, hint: error.hint });
  return { data: null, error: error.message };
}

  const rows: ListingRow[] = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const photos = (Array.isArray(row.vendor_listing_photos)
      ? row.vendor_listing_photos
      : []) as ListingPhoto[];
    const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
    const cover = sorted.find((p) => p.is_cover) ?? sorted[0] ?? null;
    const category = extractCategory(row.marketplace_categories);

    return {
      id: row.id as string,
      vendor_id: row.vendor_id as string,
      category_id: row.category_id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      city: (row.city as string | null) ?? null,
      attributes: (row.attributes as Record<string, unknown> | null) ?? null,
      is_active: row.is_active as boolean,
      created_at: row.created_at as string,
      cover_photo: cover,
      photo_count: photos.length,
      category_name: category?.name ?? null,
    };
  });

  return { data: rows, error: null };
}

export async function fetchListing(
  supabase: SupabaseClient,
  listingId: string
): Promise<{ data: FullListing | null; error: string | null }> {
  const [listingResult, packagesResult] = await Promise.all([
    supabase
      .from('vendor_listings')
      .select(`
        id, vendor_id, category_id, title, description, city, attributes, is_active, created_at,
        vendor_listing_photos ( id, listing_id, path, sort_order, is_cover, created_at ),
        marketplace_categories ( id, name )
      `)
      .eq('id', listingId)
      .single(),
    supabase
      .from('vendor_packages')
      .select('id, listing_id, name, description, pricing_model, price, price_currency, sort_order, is_active')
      .eq('listing_id', listingId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (listingResult.error || !listingResult.data) {
    logger.error('fetchListing: query failed', listingResult.error);
    return { data: null, error: listingResult.error?.message ?? 'Listing not found.' };
  }

  if (packagesResult.error) {
    logger.error('fetchListing: packages query failed', packagesResult.error);
  }

  const row = listingResult.data as Record<string, unknown>;
  const rawPhotos = (Array.isArray(row.vendor_listing_photos)
    ? row.vendor_listing_photos
    : []) as ListingPhoto[];
  const sortedPhotos = [...rawPhotos].sort((a, b) => a.sort_order - b.sort_order);
  const category = extractCategory(row.marketplace_categories);

  return {
    data: {
      id: row.id as string,
      vendor_id: row.vendor_id as string,
      category_id: row.category_id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      city: (row.city as string | null) ?? null,
      attributes: (row.attributes as Record<string, unknown> | null) ?? null,
      is_active: row.is_active as boolean,
      created_at: row.created_at as string,
      vendor_listing_photos: sortedPhotos,
      vendor_packages: (packagesResult.data ?? []) as VendorPackage[],
      category_name: category?.name ?? null,
    },
    error: null,
  };
}

export async function fetchListingPhotos(
  supabase: SupabaseClient,
  listingId: string
): Promise<{ data: ListingPhoto[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('vendor_listing_photos')
    .select('id, listing_id, path, sort_order, is_cover, created_at')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error('fetchListingPhotos: query failed', error);
    return { data: null, error: error.message };
  }

  return { data: data as ListingPhoto[], error: null };
}

export async function updatePhotoOrder(
  supabase: SupabaseClient,
  photos: { id: string; sort_order: number }[]
): Promise<{ data: null; error: string | null }> {
  const results = await Promise.all(
    photos.map(({ id, sort_order }) =>
      supabase.from('vendor_listing_photos').update({ sort_order }).eq('id', id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    logger.error('updatePhotoOrder: update failed', failed.error);
    return { data: null, error: failed.error.message };
  }

  return { data: null, error: null };
}

export async function deleteListingPhoto(
  supabase: SupabaseClient,
  photoId: string
): Promise<{ data: null; error: string | null }> {
  const { error } = await supabase
    .from('vendor_listing_photos')
    .delete()
    .eq('id', photoId);

  if (error) {
    logger.error('deleteListingPhoto: delete failed', error);
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}
