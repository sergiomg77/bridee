import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import { DressWithBoutique } from '../../types/dress';

export async function fetchDresses(): Promise<{ data: DressWithBoutique[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('dresses')
      .select(`
        *,
        boutique_dresses!inner(*)
      `)
      .eq('boutique_dresses.is_active', true);

    if (error) {
      logger.error('fetchDresses failed', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as DressWithBoutique[]) ?? [], error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to fetch dresses.');
    logger.error('fetchDresses unexpected error', error);
    return { data: null, error };
  }
}

export async function likeDress(userId: string, dressId: string): Promise<{ data: null; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('user_likes')
      .insert({ user_id: userId, dress_id: dressId });

    if (error) {
      logger.error('likeDress failed', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: null, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to like dress.');
    logger.error('likeDress unexpected error', error);
    return { data: null, error };
  }
}
