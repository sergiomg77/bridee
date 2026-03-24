import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

export function getDressPhotoUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return 'no-image';
  return `${supabaseUrl}/storage/v1/object/public/dress-photos/${imagePath}`;
}

export function getTryOnResultUrl(path: string | null | undefined): string {
  if (!path) return 'no-image';
  return `${supabaseUrl}/storage/v1/object/public/tryon-photos/${path}`;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
