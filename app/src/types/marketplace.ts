export interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'boolean';
  options?: string[];
}

export interface FilterConfig {
  filters: FilterField[];
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  icon_name: string | null;
  sort_order: number;
  is_active: boolean;
  filter_config: FilterConfig | null;
}

export interface VendorListingPhoto {
  id: string;
  listing_id: string;
  path: string;
  sort_order: number;
}

export interface VendorPackage {
  id: string;
  listing_id: string;
  name: string;
  description: string | null;
  pricing_model: 'fixed' | 'per_hour' | 'quote';
  price: number | null;
  price_currency: string;
  sort_order: number;
  is_active: boolean;
}

export interface VendorListing {
  id: string;
  vendor_id: string;
  category_id: string;
  title: string;
  description: string | null;
  city: string | null;
  attributes: Record<string, unknown>;
  is_active: boolean;
  photos: VendorListingPhoto[];
  packages: VendorPackage[];
  vendor_name: string;
  vendor_logo_path: string | null;
}

export interface SavedListing {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing: VendorListing;
}
