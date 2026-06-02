import { apiFetch } from '../api';
import { API } from '../../constants/api';
import type { MarketplaceCategory, VendorListing, SavedListing } from '../../types/marketplace';

function mapListing(raw: Record<string, unknown>): VendorListing {
  const vendor = (raw.vendors ?? {}) as Record<string, unknown>;
  return {
    id: raw.id as string,
    vendor_id: raw.vendor_id as string,
    category_id: raw.category_id as string,
    title: raw.title as string,
    description: (raw.description as string | null) ?? null,
    city: (raw.city as string | null) ?? null,
    attributes: (raw.attributes as Record<string, unknown>) ?? {},
    is_active: raw.is_active as boolean,
    photos: ((raw.vendor_listing_photos ?? []) as Record<string, unknown>[]).map(p => ({
      id: p.id as string,
      listing_id: p.listing_id as string,
      path: p.path as string,
      sort_order: p.sort_order as number,
    })),
    packages: ((raw.vendor_packages ?? []) as Record<string, unknown>[]).map(p => ({
      id: p.id as string,
      listing_id: p.listing_id as string,
      name: p.name as string,
      description: (p.description as string | null) ?? null,
      pricing_model: p.pricing_model as 'fixed' | 'per_hour' | 'quote',
      price: (p.price as number | null) ?? null,
      price_currency: (p.price_currency as string) ?? 'VND',
      sort_order: (p.sort_order as number) ?? 0,
      is_active: (p.is_active as boolean) ?? true,
    })),
    vendor_name: (vendor.name as string) ?? '',
    vendor_logo_path: (vendor.logo_path as string | null) ?? null,
    avg_rating: (raw.avg_rating as number | null) ?? null,
    review_count: (raw.review_count as number | null) ?? null,
    is_new: (raw.is_new as boolean) ?? false,
    discount_percent: (raw.discount_percent as number | null) ?? null,
  };
}

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
  const result = await apiFetch<Record<string, unknown>[]>(
    `${API.marketplace.listings()}?${params.toString()}`,
    { method: 'GET' }
  );
  if (result.data) {
    return { data: result.data.map(mapListing), error: null };
  }
  return { data: null, error: result.error };
}

export async function getListingDetail(
  id: string
): Promise<{ data: VendorListing | null; error: string | null }> {
  const result = await apiFetch<Record<string, unknown>>(
    API.marketplace.listingDetail(id),
    { method: 'GET' }
  );
  if (result.data) {
    return { data: mapListing(result.data), error: null };
  }
  return { data: null, error: result.error };
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
