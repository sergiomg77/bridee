import { apiFetch } from '../api';
import { API } from '../../constants/api';
import type { Boutique, BoutiqueReview, SavedBoutique } from '../../types/boutique';
import type { AppointmentSlot } from '../../types/appointment';
import type { BoutiqueDress } from '../../types/dress';

export async function getBoutique(
  id: string
): Promise<{ data: Boutique | null; error: string | null }> {
  return apiFetch<Boutique>(API.boutiques.detail(id), { method: 'GET' });
}

export async function getBoutiqueSlots(
  id: string
): Promise<{ data: AppointmentSlot[] | null; error: string | null }> {
  return apiFetch<AppointmentSlot[]>(API.boutiques.slots(id), { method: 'GET' });
}

export async function saveBoutique(
  id: string
): Promise<{ data: null; error: string | null }> {
  return apiFetch<null>(API.boutiques.save(id), { method: 'POST' });
}

export async function unsaveBoutique(
  id: string
): Promise<{ data: null; error: string | null }> {
  return apiFetch<null>(API.boutiques.save(id), { method: 'DELETE' });
}

export async function getSavedBoutiques(): Promise<{ data: SavedBoutique[] | null; error: string | null }> {
  return apiFetch<SavedBoutique[]>(API.boutiques.saved(), { method: 'GET' });
}

export async function getBoutiqueCollection(
  boutiqueId: string
): Promise<{ data: BoutiqueDress[] | null; error: string | null }> {
  return apiFetch<BoutiqueDress[]>(API.boutiques.dresses(boutiqueId), { method: 'GET' });
}

export async function getBoutiqueReviews(
  boutiqueId: string
): Promise<{ data: BoutiqueReview[] | null; error: string | null }> {
  return apiFetch<BoutiqueReview[]>(API.boutiques.reviews(boutiqueId), { method: 'GET' });
}

export async function searchBoutiques(
  params: object
): Promise<{ data: Boutique[] | null; error: string | null }> {
  const qs = `?${new URLSearchParams(params as Record<string, string>).toString()}`;
  return apiFetch<Boutique[]>(API.boutiques.search() + qs, { method: 'GET' });
}
