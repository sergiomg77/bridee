import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import { DressWithBoutique, DressWithBoutiqueDetails } from '../../types/dress';

type UserLikeRow = {
  dress_id: string;
  dresses: DressWithBoutiqueDetails | null;
};

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

export async function fetchLikedDresses(userId: string): Promise<{ data: DressWithBoutiqueDetails[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_likes')
      .select(`
        dress_id,
        dresses (
          *,
          boutique_dresses (
            *,
            boutiques (id, name)
          )
        )
      `)
      .eq('user_id', userId);

    if (error) {
      logger.error('fetchLikedDresses failed', error);
      return { data: null, error: new Error(error.message) };
    }

    const rows = (data as unknown as UserLikeRow[]) ?? [];
    const dresses = rows
      .map((row) => row.dresses)
      .filter((dress): dress is DressWithBoutiqueDetails => dress !== null);

    return { data: dresses, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to fetch liked dresses.');
    logger.error('fetchLikedDresses unexpected error', error);
    return { data: null, error };
  }
}

export async function fetchDressById(dressId: string): Promise<{ data: DressWithBoutiqueDetails | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('dresses')
      .select(`
        *,
        boutique_dresses (
          *,
          boutiques (id, name)
        )
      `)
      .eq('id', dressId)
      .single();

    if (error) {
      logger.error('fetchDressById failed', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as DressWithBoutiqueDetails, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to fetch dress.');
    logger.error('fetchDressById unexpected error', error);
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
