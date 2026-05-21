import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import { BoutiqueDressRow, DressWithBoutique, DressWithBoutiqueDetails, Dress, DressPhoto, BoutiqueDress } from '../../types/dress';
import { apiFetch } from '../api';
import { API } from '../../constants/api';

// ── Internal type for Supabase query rows ─────────────────────────────────────

type BoutiqueDressQueryRow = BoutiqueDressRow & {
  dresses: (Dress & { dress_photos: DressPhoto[] }) | null;
};

type UserLikeRow = {
  dress_id: string;
  dresses: DressWithBoutiqueDetails | null;
};

// ── Legacy Supabase-direct functions (used by existing screens) ───────────────

export async function fetchDresses(userId?: string | null): Promise<{ data: DressWithBoutique[] | null; error: Error | null }> {
  try {
    let excludedDressIds: string[] = [];
    if (userId) {
      const [{ data: likedData }, { data: skippedData }] = await Promise.all([
        supabase.from('user_likes').select('dress_id').eq('user_id', userId),
        supabase.from('user_skips').select('dress_id').eq('user_id', userId),
      ]);
      const likedIds = (likedData ?? []).map((row: { dress_id: string }) => row.dress_id);
      const skippedIds = (skippedData ?? []).map((row: { dress_id: string }) => row.dress_id);
      excludedDressIds = [...new Set([...likedIds, ...skippedIds])];
    }

    let query = supabase
      .from('boutique_dresses')
      .select(`
        *,
        dresses (
          *,
          dress_photos (id, path, sort_order, is_tryon_eligible)
        )
      `)
      .eq('is_active', true)
      .eq('dresses.is_deleted', false);

    if (excludedDressIds.length > 0) {
      query = query.not('dress_id', 'in', `(${excludedDressIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('fetchDresses failed', error);
      return { data: null, error: new Error(error.message) };
    }

    const map = new Map<string, DressWithBoutique>();
    for (const row of (data as BoutiqueDressQueryRow[]) ?? []) {
      if (!row.dresses) continue;
      const { dresses: dressData, ...boutiqueDress } = row;
      const { dress_photos, ...dress } = dressData;
      const existing = map.get(row.dress_id);
      if (existing) {
        existing.boutique_dresses.push(boutiqueDress);
      } else {
        map.set(row.dress_id, {
          ...dress,
          dress_photos,
          boutique_dresses: [boutiqueDress],
        });
      }
    }

    return { data: Array.from(map.values()), error: null };
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
          dress_photos (id, path, sort_order, is_tryon_eligible),
          boutique_dresses (
            *,
            boutiques (id, name)
          )
        )
      `)
      .eq('user_id', userId)
      .eq('dresses.is_deleted', false);

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
        dress_photos (id, path, sort_order, is_tryon_eligible),
        boutique_dresses (
          *,
          boutiques (id, name)
        )
      `)
      .eq('id', dressId)
      .eq('is_deleted', false)
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

export async function removeLikedDress(userId: string, dressId: string): Promise<{ data: null; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('user_likes')
      .delete()
      .eq('user_id', userId)
      .eq('dress_id', dressId);

    if (error) {
      logger.error('removeLikedDress failed', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: null, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to remove liked dress.');
    logger.error('removeLikedDress unexpected error', error);
    return { data: null, error };
  }
}

export async function skipDress(userId: string, dressId: string): Promise<{ data: null; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('user_skips')
      .insert({ user_id: userId, dress_id: dressId });

    if (error) {
      logger.error('skipDress failed', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: null, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to skip dress.');
    logger.error('skipDress unexpected error', error);
    return { data: null, error };
  }
}

// ── v3 API functions ──────────────────────────────────────────────────────────

export async function getFeed(
  filters?: object
): Promise<{ data: BoutiqueDress[] | null; error: string | null }> {
  const qs = filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : '';
  const url = API.dresses.feed() + qs;
  console.log('[getFeed] calling:', url);
  const result = await apiFetch<BoutiqueDress[]>(url, { method: 'GET' });
  console.log('[getFeed] result — isArray:', Array.isArray(result.data), '| count:', Array.isArray(result.data) ? result.data.length : 'n/a', '| error:', result.error);
  return result;
}

export async function getExplore(): Promise<{
  data: {
    trending: BoutiqueDress[];
    top: BoutiqueDress[];
    new_arrivals: BoutiqueDress[];
    hot_deals: BoutiqueDress[];
  } | null;
  error: string | null;
}> {
  return apiFetch(API.dresses.explore(), { method: 'GET' });
}

export async function getDressDetail(
  boutiqueDressId: string
): Promise<{ data: BoutiqueDress | null; error: string | null }> {
  return apiFetch<BoutiqueDress>(API.dresses.detail(boutiqueDressId), { method: 'GET' });
}

export async function getSimilar(
  boutiqueDressId: string
): Promise<{ data: BoutiqueDress[] | null; error: string | null }> {
  return apiFetch<BoutiqueDress[]>(API.dresses.similar(boutiqueDressId), { method: 'GET' });
}

export async function searchDresses(
  params: object
): Promise<{ data: BoutiqueDress[] | null; error: string | null }> {
  const qs = `?${new URLSearchParams(params as Record<string, string>).toString()}`;
  return apiFetch<BoutiqueDress[]>(API.dresses.search() + qs, { method: 'GET' });
}
