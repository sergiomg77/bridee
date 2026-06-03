import { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import { AuthFormData, AuthResult } from '../../types/auth';

WebBrowser.maybeCompleteAuthSession();

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

    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'bridee',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      logger.error('signInWithGoogle: OAuth URL generation failed', error);
      return { data: null, error: error ?? new Error('Failed to get OAuth URL') };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type !== 'success') {
      logger.info('signInWithGoogle: user cancelled or failed', { type: result.type });
      return { data: null, error: null };
    }

    const url = result.url;
    const params = new URL(url);
    const accessToken = params.searchParams.get('access_token');
    const refreshToken = params.searchParams.get('refresh_token');

    if (!accessToken) {
      logger.error('signInWithGoogle: no access token in callback URL');
      return { data: null, error: new Error('No access token received') };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken ?? '',
    });

    if (sessionError) {
      logger.error('signInWithGoogle: setSession failed', sessionError);
      return { data: null, error: sessionError };
    }

    logger.info('signInWithGoogle: success', { userId: sessionData.user?.id });
    return { data: null, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Google sign in failed.');
    logger.error('signInWithGoogle failed', error);
    return { data: null, error };
  }
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email ?? null;
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
