export type UserRole = 'bride' | 'boutique' | 'vendor' | 'admin';

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_path: string | null;
  phone: string | null;
  language: 'vi' | 'en';
  currency: string;
  city: string | null;
  budget_min: number | null;
  budget_max: number | null;
  style_preferences: string[] | null;
  roles: UserRole[];
}
