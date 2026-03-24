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
  condition: string | null;
  availability: string | null;
  fabric: string[] | null;
  details: string[] | null;
  occasions: string[] | null;
  style_tags: string[] | null;
  consent_confirmed: boolean;
  created_at: string;
}

export interface BoutiqueDress {
  id: string;
  dress_id: string;
  boutique_id: string;
  sku: string | null;
  price: number | null;
  price_visible: boolean;
  available_sizes: string[] | null;
  is_active: boolean;
}

export interface DressWithBoutique extends Dress {
  boutique_dresses: BoutiqueDress[];
  dress_photos: DressPhoto[];
}

export interface Boutique {
  id: string;
  name: string;
}

export interface BoutiqueDressWithDetails extends BoutiqueDress {
  boutiques: Boutique | null;
}

export interface DressWithBoutiqueDetails extends Dress {
  boutique_dresses: BoutiqueDressWithDetails[];
  dress_photos: DressPhoto[];
}
