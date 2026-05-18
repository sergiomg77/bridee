import { apiFetch } from '../api';
import { API } from '../../constants/api';
import type { MarketplaceCategory, VendorListing, SavedListing } from '../../types/marketplace';

export async function getCategories(): Promise<{ data: MarketplaceCategory[] | null; error: string | null }> {
  return apiFetch<MarketplaceCategory[]>(API.marketplace.categories(), { method: 'GET' });
}

export async function getListings(
  categoryId: string,
  filters?: object
): Promise<{ data: VendorListing[] | null; error: string | null }> {
  const params = new URLSearchParams({ category_id: categoryId });
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
  }
  return apiFetch<VendorListing[]>(`${API.marketplace.listings()}?${params.toString()}`, { method: 'GET' });
}

export async function getListingDetail(
  id: string
): Promise<{ data: VendorListing | null; error: string | null }> {
  return apiFetch<VendorListing>(API.marketplace.listingDetail(id), { method: 'GET' });
}

export async function saveListing(
  id: string
): Promise<{ data: null; error: string | null }> {
  return apiFetch<null>(API.marketplace.listingSave(id), { method: 'POST' });
}

export async function unsaveListing(
  id: string
): Promise<{ data: null; error: string | null }> {
  return apiFetch<null>(API.marketplace.listingSave(id), { method: 'DELETE' });
}

export async function getSavedListings(): Promise<{ data: SavedListing[] | null; error: string | null }> {
  return apiFetch<SavedListing[]>(API.marketplace.savedListings(), { method: 'GET' });
}

export async function getVendor(
  id: string
): Promise<{ data: VendorListing | null; error: string | null }> {
  return apiFetch<VendorListing>(API.marketplace.vendor(id), { method: 'GET' });
}
