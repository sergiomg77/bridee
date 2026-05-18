export interface BoutiqueCoverPhoto {
  id: string;
  boutique_id: string;
  path: string;
  sort_order: number;
}

export interface BoutiqueOpeningHours {
  id: string;
  boutique_id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface BoutiqueService {
  id: string;
  boutique_id: string;
  name: string;
  sort_order: number;
}

export interface BoutiquePromotion {
  id: string;
  boutique_id: string;
  description: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface BoutiqueReview {
  id: string;
  boutique_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  wedding_date: string | null;
  reviewer_role: string | null;
  hired_via_bridee: boolean | null;
  is_published: boolean;
  created_at: string;
}

export interface Boutique {
  id: string;
  name: string;
  slug: string;
  about: string | null;
  address: string | null;
  city: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  zalo: string;
  email: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  logo_path: string | null;
  specialty_tags: string[] | null;
  credential_tags: string[] | null;
  tier_label: string | null;
  is_top_rated: boolean;
  status: string;
  cover_photos: BoutiqueCoverPhoto[];
  opening_hours: BoutiqueOpeningHours[];
  services: BoutiqueService[];
  promotions: BoutiquePromotion[];
}

export type SavedBoutique = Boutique & {
  review_count: number;
  avg_rating: number;
};
