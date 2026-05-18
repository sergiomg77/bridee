import { supabase } from '../../lib/supabase';
import { apiFetch } from '../api';
import { API } from '../../constants/api';
import type { UserProfile } from '../../types/profile';

// ── Legacy DB-level type (used by GeneralInformationScreen) ──────────────────

export type UserProfileDB = {
  role: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string;
  preferred_communication: string | null;
  city: string | null;
  age: number | null;
  wedding_month: number | null;
  wedding_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  body_shape: string | null;
};

export async function loadProfile(userId: string): Promise<{ data: UserProfileDB | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role,first_name,last_name,country,preferred_communication,city,age,wedding_month,wedding_year,height_cm,weight_kg,body_shape')
    .eq('id', userId)
    .maybeSingle();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as UserProfileDB | null, error: null };
}

export async function saveProfile(userId: string, profile: Partial<UserProfileDB>): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: userId, country: 'VN', ...profile, updated_at: new Date().toISOString() });

  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ── v3 API functions ──────────────────────────────────────────────────────────

export async function getProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
  return apiFetch<UserProfile>(API.users.profile(), { method: 'GET' });
}

export async function updateProfile(
  data: Partial<UserProfile>
): Promise<{ data: UserProfile | null; error: string | null }> {
  return apiFetch<UserProfile>(API.users.profile(), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getRoles(): Promise<{ data: string[] | null; error: string | null }> {
  return apiFetch<string[]>(API.users.roles(), { method: 'GET' });
}

export async function redeemPromo(
  code: string
): Promise<{ data: null; error: string | null }> {
  return apiFetch<null>(API.users.promo(), {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
