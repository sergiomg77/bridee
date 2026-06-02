import { type Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import logger from '@/lib/logger';

export async function getSession(): Promise<Session | null> {
  const supabase = createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    logger.error('getSession: failed', error);
    return null;
  }
  return session;
}

export async function getToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logger.error('signIn: failed', error);
    return { error: error.message };
  }
  return { error: null };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.error('signOut: failed', error);
  }
}
