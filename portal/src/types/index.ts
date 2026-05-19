// ─── Boutique ─────────────────────────────────────────────────────────────────

export interface BoutiqueCoverPhoto {
  id: string;
  boutique_id: string;
  path: string;
  sort_order: number;
  created_at: string;
}

export interface BoutiqueOpeningHours {
  id: string;
  boutique_id: string;
  day_of_week: number; // 0=Sun … 6=Sat
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface BoutiqueService {
  id: string;
  boutique_id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface BoutiquePromotion {
  id: string;
  boutique_id: string;
  title: string;
  description: string | null;
  discount_type: 'percent' | 'fixed' | null;
  discount_value: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Boutique {
  id: string;
  owner_user_id: string;
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
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  updated_at: string;
  cover_photos?: BoutiqueCoverPhoto[];
  opening_hours?: BoutiqueOpeningHours[];
  services?: BoutiqueService[];
  promotions?: BoutiquePromotion[];
}

// ─── Dress ────────────────────────────────────────────────────────────────────

export interface DressPhoto {
  id: string;
  dress_id: string;
  path: string;
  sort_order: number;
  is_tryon_eligible: boolean;
  created_at: string;
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
  is_deleted: boolean;
  created_at: string;
  photos?: DressPhoto[];
}

export interface BoutiqueDress {
  id: string;
  dress_id: string;
  boutique_id: string;
  sku: string | null;
  price: number | null;
  original_price: number | null;
  rent_price: number | null;
  original_rent_price: number | null;
  price_range_min: number | null;
  price_range_max: number | null;
  price_visible: boolean;
  deal_price: number | null;
  deal_pct: number | null;
  deal_active: boolean;
  currency_id: number | null;
  available_sizes: string[] | null;
  additional_services: string[] | null;
  is_active: boolean;
  is_range: boolean;
  range_pct: number | null;
  created_at: string;
  dress?: Dress;
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export interface AppointmentSlot {
  id: string;
  boutique_id: string;
  slot_date: string;
  slot_time: string;
  capacity: number;
  booked_count: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  boutique_id: string;
  user_id: string;
  slot_id: string;
  status: 'pending' | 'confirmed' | 'cancelled_by_bride' | 'cancelled_by_boutique';
  full_name: string;
  phone: string;
  special_request: string | null;
  try_multiple_dresses: boolean;
  guest_count: number;
  created_at: string;
  updated_at: string;
  slot?: AppointmentSlot;
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  message_type: 'text' | 'image';
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  participant_type: 'boutique' | 'vendor';
  boutique_id: string | null;
  vendor_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  messages?: Message[];
  unread_count?: number;
}

// ─── Packages ─────────────────────────────────────────────────────────────────

export interface BoutiquePackage {
  id: string;
  boutique_id: string;
  name: string;
  description: string | null;
  bundle_price: number | null;
  discount_pct: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  dress_ids?: string[];
}
