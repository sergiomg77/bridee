import { supabase } from '../../lib/supabase';

export type UserProfile = {
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

export async function loadProfile(userId: string): Promise<{ data: UserProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role,first_name,last_name,country,preferred_communication,city,age,wedding_month,wedding_year,height_cm,weight_kg,body_shape')
    .eq('id', userId)
    .maybeSingle();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as UserProfile | null, error: null };
}

export async function saveProfile(userId: string, profile: Partial<UserProfile>): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: userId, country: 'VN', ...profile, updated_at: new Date().toISOString() });

  if (error) return { error: new Error(error.message) };
  return { error: null };
}
