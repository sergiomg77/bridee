import { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DressFormData {
  title: string;
  subtitle?: string;
  long_description?: string;
  color_name?: string;
  color_code?: string;
  style_tags: string[];
  image_path?: string;
}

export interface BoutiqueDressFormData {
  price: number;
  available_sizes: string[];
  is_active: boolean;
}

export interface Dress {
  id: string;
  title: string;
  subtitle: string | null;
  long_description: string | null;
  color_name: string | null;
  color_code: string | null;
  style_tags: string[] | null;
  image_path: string | null;
  created_at: string;
}

export interface BoutiqueDress {
  id: string;
  dress_id: string;
  boutique_id: string;
  price: number | null;
  available_sizes: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface BoutiqueDressRow {
  id: string; // boutique_dresses.id
  dress_id: string;
  price: number | null;
  available_sizes: string[] | null;
  is_active: boolean;
  dresses: {
    id: string;
    title: string;
    subtitle: string | null;
    long_description: string | null;
    color_name: string | null;
    color_code: string | null;
    style_tags: string[] | null;
    image_path: string | null;
  } | null;
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function createDress(
  supabase: SupabaseClient,
  data: DressFormData
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
  data: Partial<DressFormData>
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

export async function fetchBoutiqueDresses(
  supabase: SupabaseClient,
  boutiqueId: string
): Promise<{ data: BoutiqueDressRow[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('boutique_dresses')
    .select(`
      id,
      dress_id,
      price,
      available_sizes,
      is_active,
      dresses (
        id,
        title,
        subtitle,
        long_description,
        color_name,
        color_code,
        style_tags,
        image_path
      )
    `)
    .eq('boutique_id', boutiqueId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('fetchBoutiqueDresses: query failed', error);
    return { data: null, error: error.message };
  }

  return { data: data as BoutiqueDressRow[], error: null };
}
