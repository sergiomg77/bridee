import { apiFetch } from '../api';
import { API } from '../../constants/api';
import type { SwipeDirection, BoutiqueDress } from '../../types/dress';
import type { SwipeRecord } from '../../types/dress';

export async function recordSwipe(
  boutiqueDressId: string,
  direction: SwipeDirection
): Promise<{ data: SwipeRecord | null; error: string | null }> {
  return apiFetch<SwipeRecord>(API.swipes.record(), {
    method: 'POST',
    body: JSON.stringify({ boutique_dress_id: boutiqueDressId, direction }),
  });
}

export async function getSavedDresses(): Promise<{ data: BoutiqueDress[] | null; error: string | null }> {
  return apiFetch<BoutiqueDress[]>(API.swipes.saved(), { method: 'GET' });
}
