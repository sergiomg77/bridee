import { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import { AuthFormData, AuthResult } from '../../types/auth';

function validateAuthForm(data: AuthFormData): Error | null {
  if (!data.email || !data.email.includes('@')) {
    return new Error('Please enter a valid email address.');
  }
  if (!data.password || data.password.length < 6) {
    return new Error('Password must be at least 6 characters.');
  }
  return null;
}

export async function signIn(data: AuthFormData): Promise<AuthResult<Session>> {
  const validationError = validateAuthForm(data);
  if (validationError) {
    return { data: null, error: validationError };
  }

  try {
    logger.info('signIn called', { email: data.email });
    const { data: result, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      logger.error('signIn failed', error);
      return { data: null, error };
    }

    return { data: result.session, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Sign in failed.');
    logger.error('signIn unexpected error', error);
    return { data: null, error };
  }
}

export async function signUp(data: AuthFormData): Promise<AuthResult<Session>> {
  const validationError = validateAuthForm(data);
  if (validationError) {
    return { data: null, error: validationError };
  }

  try {
    logger.info('signUp called', { email: data.email });
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) {
      logger.error('signUp failed', error);
      return { data: null, error };
    }

    return { data: result.session, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Sign up failed.');
    logger.error('signUp unexpected error', error);
    return { data: null, error };
  }
}

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    logger.info('signInWithGoogle called');
    // TODO: Google OAuth integration
    return { data: null, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Google sign in failed.');
    logger.error('signInWithGoogle failed', error);
    return { data: null, error };
  }
}

export async function signInWithApple(): Promise<AuthResult> {
  try {
    logger.info('signInWithApple called');
    // TODO: Apple Sign In integration
    return { data: null, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Apple sign in failed.');
    logger.error('signInWithApple failed', error);
    return { data: null, error };
  }
}
