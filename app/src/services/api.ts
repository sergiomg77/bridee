import { supabase } from '../lib/supabase';
import logger from '../lib/logger';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    let authToken = token;
    if (!authToken) {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(path, { ...options, headers });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const body = await response.json() as { error?: string; message?: string };
        errorMessage = body.error ?? body.message ?? errorMessage;
      } catch {
        // ignore parse error
      }
      logger.error('apiFetch: non-ok response', { path, status: response.status, error: errorMessage });
      return { data: null, error: errorMessage };
    }

    const rawText = await response.text();
    console.log(`[apiFetch] raw body for ${path}:`, rawText.substring(0, 800));
    const json = JSON.parse(rawText) as { data: T; error: string | null };
    return { data: json.data ?? null, error: json.error ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    logger.error('apiFetch: fetch failed', { path, error: message });
    return { data: null, error: message };
  }
}
