import { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Matches dresses table v3 columns. */
export interface DressFormData {
  title: string;
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
  condition?: string;
  availability?: string;
  fabric?: string[];
  details?: string[];
  style_tags?: string[];
  event_types?: string[];
  additional_services?: string[];
  consent_confirmed?: boolean;
}

/** Matches boutique_dresses table v3 columns. */
export interface BoutiqueDressFormData {
  sku?: string;
  price_sale?: number | null;
  price_original?: number | null;
  price_rental?: number | null;
  price_rental_original?: number | null;
  price_range_min?: number | null;
  price_range_max?: number | null;
  price_currency?: string;
  price_visible?: boolean;
  deal_price?: number | null;
  deal_percent?: number | null;
  deal_active?: boolean;
  available_sizes?: string[];
  is_active?: boolean;
}

export interface DressPhoto {
  path: string;
  sort_order: number;
}

export interface Dress {
  id: string;
  title: string;
  subtitle: string | null;
  long_description: string | null;
  designer: string | null;
  silhouette: string | null;
  neckline: string | null;
  sleeve: string | null;
  back_style: string | null;
  length: string | null;
  train: string | null;
  color_name: string | null;
  color_code: string | null;
  condition: string | null;
  availability: string | null;
  fabric: string[] | null;
  details: string[] | null;
  style_tags: string[] | null;
  event_types: string[] | null;
  additional_services: string[] | null;
  consent_confirmed: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface BoutiqueDress {
  id: string;
  dress_id: string;
  boutique_id: string;
  sku: string | null;
  price_sale: number | null;
  price_original: number | null;
  price_rental: number | null;
  price_rental_original: number | null;
  price_range_min: number | null;
  price_range_max: number | null;
  price_currency: string;
  price_visible: boolean;
  deal_price: number | null;
  deal_percent: number | null;
  deal_active: boolean;
  available_sizes: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface BoutiqueDressRow {
  id: string;
  dress_id: string;
  sku: string | null;
  price_sale: number | null;
  price_original: number | null;
  price_rental: number | null;
  price_rental_original: number | null;
  price_range_min: number | null;
  price_range_max: number | null;
  price_currency: string;
  price_visible: boolean;
  deal_price: number | null;
  deal_percent: number | null;
  deal_active: boolean;
  available_sizes: string[] | null;
  is_active: boolean;
  dresses: {
    id: string;
    title: string;
    subtitle: string | null;
    designer: string | null;
    color_name: string | null;
    color_code: string | null;
    dress_photos: DressPhoto[];
  } | null;
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function createDress(
  supabase: SupabaseClient,
  data: DressFormData,
  coverPhotoPath?: string
): Promise<{ data: Dress | null; error: string | null }> {
  const { data: dress, error: dressError } = await supabase
    .from('dresses')
    .insert(data)
    .select()
    .single();

  if (dressError || !dress) {
    logger.error('createDress: insert failed', dressError);
    return { data: null, error: dressError?.message ?? 'Failed to create dress.' };
  }

  if (coverPhotoPath) {
    const { error: photoError } = await supabase
      .from('dress_photos')
      .insert({ dress_id: (dress as Dress).id, path: coverPhotoPath, sort_order: 0 });

    if (photoError) {
      logger.error('createDress: dress_photos insert failed', photoError);
      return { data: null, error: photoError.message };
    }
  }

  return { data: dress as Dress, error: null };
}

export async function createBoutiqueDress(
  supabase: SupabaseClient,
  dressId: string,
  boutiqueId: string,
  data: BoutiqueDressFormData
): Promise<{ data: BoutiqueDress | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from('boutique_dresses')
    .insert({ dress_id: dressId, boutique_id: boutiqueId, ...data })
    .select()
    .single();

  if (error || !row) {
    logger.error('createBoutiqueDress: insert failed', error);
    return { data: null, error: error?.message ?? 'Failed to create boutique dress.' };
  }

  return { data: row as BoutiqueDress, error: null };
}

export async function updateDress(
  supabase: SupabaseClient,
  id: string,
  data: Partial<DressFormData>,
  newCoverPhotoPath?: string
): Promise<{ data: Dress | null; error: string | null }> {
  const { data: dress, error: dressError } = await supabase
    .from('dresses')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (dressError || !dress) {
    logger.error('updateDress: update failed', dressError);
    return { data: null, error: dressError?.message ?? 'Failed to update dress.' };
  }

  if (newCoverPhotoPath !== undefined) {
    const { error: deleteError } = await supabase
      .from('dress_photos')
      .delete()
      .eq('dress_id', id)
      .eq('sort_order', 0);

    if (deleteError) {
      logger.error('updateDress: cover photo delete failed', deleteError);
      return { data: null, error: deleteError.message };
    }

    const { error: insertError } = await supabase
      .from('dress_photos')
      .insert({ dress_id: id, path: newCoverPhotoPath, sort_order: 0 });

    if (insertError) {
      logger.error('updateDress: cover photo insert failed', insertError);
      return { data: null, error: insertError.message };
    }
  }

  return { data: dress as Dress, error: null };
}

export async function updateBoutiqueDress(
  supabase: SupabaseClient,
  id: string,
  data: Partial<BoutiqueDressFormData>
): Promise<{ data: BoutiqueDress | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from('boutique_dresses')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error || !row) {
    logger.error('updateBoutiqueDress: update failed', error);
    return { data: null, error: error?.message ?? 'Failed to update boutique dress.' };
  }

  return { data: row as BoutiqueDress, error: null };
}

export async function softDeleteDress(
  supabase: SupabaseClient,
  dressId: string,
  boutiqueId: string
): Promise<{ error: string | null }> {
  const { data: owned, error: checkError } = await supabase
    .from('boutique_dresses')
    .select('id')
    .eq('dress_id', dressId)
    .eq('boutique_id', boutiqueId)
    .maybeSingle();

  if (checkError) {
    logger.error('softDeleteDress: ownership check failed', checkError);
    return { error: checkError.message };
  }
  if (!owned) {
    return { error: 'Dress not found or not owned by this boutique.' };
  }

  const { error } = await supabase
    .from('dresses')
    .update({ is_deleted: true })
    .eq('id', dressId);

  if (error) {
    logger.error('softDeleteDress: update failed', error);
    return { error: error.message };
  }

  return { error: null };
}

export async function fetchBoutiqueDresses(
  supabase: SupabaseClient,
  boutiqueId: string
): Promise<{ data: BoutiqueDressRow[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('boutique_dresses')
    .select(`
      id,
      dress_id,
      sku,
      price_sale,
      price_original,
      price_rental,
      price_rental_original,
      price_range_min,
      price_range_max,
      price_currency,
      price_visible,
      deal_price,
      deal_percent,
      deal_active,
      available_sizes,
      is_active,
      dresses (
        id,
        title,
        subtitle,
        designer,
        color_name,
        color_code,
        dress_photos ( path, sort_order )
      )
    `)
    .eq('boutique_id', boutiqueId)
    .eq('dresses.is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('fetchBoutiqueDresses: query failed', error);
    return { data: null, error: error.message };
  }

  const rows: BoutiqueDressRow[] = (data ?? []).map((row) => ({
    id: row.id,
    dress_id: row.dress_id,
    sku: row.sku,
    price_sale: row.price_sale ?? null,
    price_original: row.price_original ?? null,
    price_rental: row.price_rental ?? null,
    price_rental_original: row.price_rental_original ?? null,
    price_range_min: row.price_range_min ?? null,
    price_range_max: row.price_range_max ?? null,
    price_currency: row.price_currency ?? 'VND',
    price_visible: row.price_visible ?? true,
    deal_price: row.deal_price ?? null,
    deal_percent: row.deal_percent ?? null,
    deal_active: row.deal_active ?? false,
    available_sizes: row.available_sizes ?? null,
    is_active: row.is_active ?? false,
    dresses: Array.isArray(row.dresses) ? (row.dresses[0] ?? null) : row.dresses,
  }));

  return { data: rows, error: null };
}
