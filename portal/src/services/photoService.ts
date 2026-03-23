import { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DressPhotoRow {
  id: string;
  dress_id: string;
  path: string;
  sort_order: number;
  is_tryon_eligible: boolean;
  created_at: string;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Fetches all photos for a dress, ordered by sort_order ascending.
 */
export async function fetchDressPhotos(
  supabase: SupabaseClient,
  dressId: string
): Promise<{ data: DressPhotoRow[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('dress_photos')
    .select('id, dress_id, path, sort_order, is_tryon_eligible, created_at')
    .eq('dress_id', dressId)
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error('fetchDressPhotos: query failed', error);
    return { data: null, error: error.message };
  }

  return { data: data as DressPhotoRow[], error: null };
}

/**
 * Inserts a new dress_photos row.
 */
export async function addDressPhoto(
  supabase: SupabaseClient,
  dressId: string,
  path: string,
  sortOrder: number
): Promise<{ data: DressPhotoRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('dress_photos')
    .insert({ dress_id: dressId, path, sort_order: sortOrder })
    .select()
    .single();

  if (error || !data) {
    logger.error('addDressPhoto: insert failed', error);
    return { data: null, error: error?.message ?? 'Failed to add photo.' };
  }

  return { data: data as DressPhotoRow, error: null };
}

/**
 * Deletes a dress_photos row by id.
 */
export async function deleteDressPhoto(
  supabase: SupabaseClient,
  photoId: string
): Promise<{ data: null; error: string | null }> {
  const { error } = await supabase
    .from('dress_photos')
    .delete()
    .eq('id', photoId);

  if (error) {
    logger.error('deleteDressPhoto: delete failed', error);
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

/**
 * Updates sort_order for multiple photos in parallel.
 */
export async function updatePhotoOrder(
  supabase: SupabaseClient,
  photos: { id: string; sort_order: number }[]
): Promise<{ data: null; error: string | null }> {
  const results = await Promise.all(
    photos.map(({ id, sort_order }) =>
      supabase.from('dress_photos').update({ sort_order }).eq('id', id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    logger.error('updatePhotoOrder: update failed', failed.error);
    return { data: null, error: failed.error.message };
  }

  return { data: null, error: null };
}

/**
 * Sets is_tryon_eligible = true for photoId and false for all other
 * photos of the same dress.
 */
export async function setTryOnPhoto(
  supabase: SupabaseClient,
  dressId: string,
  photoId: string
): Promise<{ data: null; error: string | null }> {
  // Clear all tryon flags for this dress first
  const { error: clearError } = await supabase
    .from('dress_photos')
    .update({ is_tryon_eligible: false })
    .eq('dress_id', dressId);

  if (clearError) {
    logger.error('setTryOnPhoto: clear failed', clearError);
    return { data: null, error: clearError.message };
  }

  // Set the target photo as tryon eligible
  const { error: setError } = await supabase
    .from('dress_photos')
    .update({ is_tryon_eligible: true })
    .eq('id', photoId);

  if (setError) {
    logger.error('setTryOnPhoto: set failed', setError);
    return { data: null, error: setError.message };
  }

  return { data: null, error: null };
}
