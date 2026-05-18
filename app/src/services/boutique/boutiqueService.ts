import { apiFetch } from '../api';
import { API } from '../../constants/api';
import type { Boutique, SavedBoutique } from '../../types/boutique';
import type { AppointmentSlot } from '../../types/appointment';

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
