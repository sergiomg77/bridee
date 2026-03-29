import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_BRIDEE_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_BRIDEE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_BRIDEE_SUPABASE_URL or EXPO_PUBLIC_BRIDEE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function getDressPhotoUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return 'no-image';
  return `${supabaseUrl}/storage/v1/object/public/dress-photos/${imagePath}`;
}

export async function getTryOnResultUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from('tryon-photos')
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}
