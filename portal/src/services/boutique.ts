import { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

export interface BoutiqueUpdate {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  zalo?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  logo_url?: string;
  is_active?: boolean;
}

export interface Boutique {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  zalo: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export async function getBoutique(
  supabase: SupabaseClient,
  boutiqueId: string
): Promise<{ data: Boutique | null; error: string | null }> {
  const { data, error } = await supabase
    .from('boutiques')
    .select('*')
    .eq('id', boutiqueId)
    .single();

  if (error) {
    logger.error('getBoutique: query failed', error);
    return { data: null, error: error.message };
  }

  return { data: data as Boutique, error: null };
}

export async function updateBoutique(
  supabase: SupabaseClient,
  boutiqueId: string,
  values: Partial<BoutiqueUpdate>
): Promise<{ data: Boutique | null; error: string | null }> {
  const { data, error } = await supabase
    .from('boutiques')
    .update(values)
    .eq('id', boutiqueId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error('updateBoutique: update failed', error);
    return { data: null, error: error.message };
  }

  return { data: data as Boutique, error: null };
}
