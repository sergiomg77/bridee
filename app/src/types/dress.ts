export interface DressPhoto {
  id: string;
  dress_id: string;
  path: string;
  sort_order: number;
  is_tryon_eligible: boolean;
}

export interface Dress {
  id: string;
  title: string;
  subtitle: string | null;
  long_description: string | null;
  designer: string | null;
  silhouette: string | null;
  neckline: string | null;
  sleeve: string | null;
  back_style: string | null;
  length: string | null;
  train: string | null;
  color_name: string | null;
  color_code: string | null;
  fabric: string[] | null;
  details: string[] | null;
  style_tags: string[] | null;
  event_types: string[] | null;
  condition: string | null;
  availability: string | null;
  additional_services: string[] | null;
  consent_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export type SwipeDirection = 'like' | 'skip';

export interface SwipeRecord {
  id: string;
  user_id: string;
  boutique_dress_id: string;
  direction: SwipeDirection;
  created_at: string;
}

// Nested dress returned by Supabase join (key matches table name "dresses")
export interface NestedDress {
  id: string;
  title: string;
  subtitle: string | null;
  long_description: string | null;
  designer: string | null;
  silhouette: string | null;
  neckline: string | null;
  sleeve: string | null;
  back_style: string | null;
  length: string | null;
  train: string | null;
  color_name: string | null;
  color_code: string | null;
  fabric: string[] | null;
  details: string[] | null;
  style_tags: string[] | null;
  event_types: string[] | null;
  condition: string | null;
  availability: string | null;
  additional_services: string[] | null;
  is_deleted: boolean;
  dress_photos: Array<{ id: string; path: string; sort_order: number; is_tryon_eligible: boolean }>;
}

// v3 API response — Supabase join keys match table names ("dresses", "boutiques")
export interface BoutiqueDress {
  id: string;
  dress_id: string;
  boutique_id: string;
  sku: string | null;
  price_sale: number | null;
  price_original: number | null;
  price_rental: number | null;
  price_rental_original: number | null;
  price_range_min: number | null;
  price_range_max: number | null;
  price_currency: string;
  price_visible: boolean;
  deal_price: number | null;
  deal_percent: number | null;
  deal_active: boolean;
  available_sizes: string[] | null;
  is_active: boolean;
  created_at?: string;
  dresses: NestedDress;
  boutiques: { id: string; name: string; city: string | null };
}

// ── Legacy DB-level types (used by Supabase-direct queries in existing screens) ──

export interface BoutiqueDressRow {
  id: string;
  dress_id: string;
  boutique_id: string;
  sku: string | null;
  price: number | null;
  price_visible: boolean;
  available_sizes: string[] | null;
  is_active: boolean;
}

export interface Boutique {
  id: string;
  name: string;
}

export interface BoutiqueDressWithDetails extends BoutiqueDressRow {
  boutiques: Boutique | null;
}

export interface DressWithBoutique extends Dress {
  boutique_dresses: BoutiqueDressRow[];
  dress_photos: DressPhoto[];
}

export interface DressWithBoutiqueDetails extends Dress {
  boutique_dresses: BoutiqueDressWithDetails[];
  dress_photos: DressPhoto[];
}
