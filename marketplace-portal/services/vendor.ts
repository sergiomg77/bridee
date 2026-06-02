import { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

export interface VendorUpdate {
  name?: string;
  description?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  zalo?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  logo_path?: string;
}

export interface Vendor {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  zalo: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  logo_path: string | null;
  status: string;
  created_at: string;
}

export async function getVendor(
  supabase: SupabaseClient,
  vendorId: string
): Promise<{ data: Vendor | null; error: string | null }> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .single();

  if (error) {
    logger.error('getVendor: query failed', error);
    return { data: null, error: error.message };
  }

  return { data: data as Vendor, error: null };
}

export async function updateVendor(
  supabase: SupabaseClient,
  vendorId: string,
  values: Partial<VendorUpdate>
): Promise<{ data: Vendor | null; error: string | null }> {
  const { data, error } = await supabase
    .from('vendors')
    .update(values)
    .eq('id', vendorId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error('updateVendor: update failed', error);
    return { data: null, error: error.message };
  }

  return { data: data as Vendor, error: null };
}
