import { apiFetch } from '../api';
import { API } from '../../constants/api';
import type { SwipeDirection, SwipeRecord, SavedDressRecord } from '../../types/dress';

export async function recordSwipe(
  boutiqueDressId: string,
  direction: SwipeDirection
): Promise<{ data: SwipeRecord | null; error: string | null }> {
  return apiFetch<SwipeRecord>(API.swipes.record(), {
    method: 'POST',
    body: JSON.stringify({ boutique_dress_id: boutiqueDressId, direction }),
  });
}

export async function getSavedDresses(): Promise<{ data: SavedDressRecord[] | null; error: string | null }> {
  return apiFetch<SavedDressRecord[]>(API.swipes.saved(), { method: 'GET' });
}
