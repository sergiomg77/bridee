import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../../lib/logger';

export type TryOnResult = {
  id: string;
  dress_id: string | null;
  result_path: string | null;
  seen_at: string | null;
  created_at: string | null;
};

export async function fetchTryOnResults(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: TryOnResult[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('tryon_queue')
    .select('id, dress_id, result_path, seen_at, created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('fetchTryOnResults: failed to fetch results', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as TryOnResult[], error: null };
}

export async function markResultAsSeen(
  supabase: SupabaseClient,
  jobId: string
): Promise<{ data: unknown; error: Error | null }> {
  const { data, error } = await supabase
    .from('tryon_queue')
    .update({ seen_at: new Date().toISOString() })
    .eq('id', jobId);

  if (error) {
    logger.error('markResultAsSeen: failed to update seen_at', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

export async function createSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<{ data: string | null; error: Error | null }> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) {
    logger.error(`createSignedUrl: failed for ${bucket}/${path}`, error);
    return { data: null, error: new Error(error.message) };
  }

  return { data: data.signedUrl, error: null };
}

export async function getUnseenCount(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: number | null; error: Error | null }> {
  const { count, error } = await supabase
    .from('tryon_queue')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .is('seen_at', null);

  if (error) {
    logger.error('getUnseenCount: failed to count unseen results', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data: count ?? 0, error: null };
}
