import { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Matches dresses table columns (no id / created_at). */
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
  occasions?: string[];
  style_tags?: string[];
  consent_confirmed?: boolean;
}

/** Matches boutique_dresses table columns (no id / dress_id / boutique_id / created_at). */
export interface BoutiqueDressFormData {
  sku?: string;
  price?: number;
  price_visible?: boolean;
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
  occasions: string[] | null;
  style_tags: string[] | null;
  consent_confirmed: boolean;
  created_at: string;
}

export interface BoutiqueDress {
  id: string;
  dress_id: string;
  boutique_id: string;
  sku: string | null;
  price: number | null;
  price_visible: boolean;
  available_sizes: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface BoutiqueDressRow {
  id: string; // boutique_dresses.id
  dress_id: string;
  sku: string | null;
  price: number | null;
  price_visible: boolean;
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

/**
 * Insert a new dress, then insert the cover photo into dress_photos
 * (sort_order = 0) if coverPhotoPath is provided.
 */
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

/**
 * Update dress fields. If newCoverPhotoPath is provided, delete the existing
 * sort_order=0 photo and insert the new one.
 */
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
  // Confirm the dress belongs to this boutique before deleting
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
      price,
      price_visible,
      available_sizes,
      is_active,
      dresses (
        id,
        title,
        subtitle,
        designer,
        color_name,
        color_code,
        dress_photos (
          path,
          sort_order
        )
      )
    `)
    .eq('boutique_id', boutiqueId)
    .eq('dresses.is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('fetchBoutiqueDresses: query failed', error);
    return { data: null, error: error.message };
  }

  // Supabase JS SDK without Database generics infers foreign-key embeds as
  // arrays at the TypeScript level even though PostgREST returns a single
  // object for many-to-one relationships. Normalise here so consumers always
  // receive the correct shape.
  const rows: BoutiqueDressRow[] = (data ?? []).map((row) => ({
    id: row.id,
    dress_id: row.dress_id,
    sku: row.sku,
    price: row.price,
    price_visible: row.price_visible,
    available_sizes: row.available_sizes,
    is_active: row.is_active,
    dresses: Array.isArray(row.dresses) ? (row.dresses[0] ?? null) : row.dresses,
  }));

  return { data: rows, error: null };
}
