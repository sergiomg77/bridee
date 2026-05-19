import { createClient } from '@/lib/supabase-server';
import logger from '@/lib/logger';

const BASE_URL = process.env.BRIDEE_API_URL ?? 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  token?: string,
): Promise<{ data: T | null; error: string | null }> {
  let authToken = token;

  if (!authToken) {
    try {
      const supabase = await createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      authToken = session?.access_token ?? undefined;
    } catch {
      // Not in a cookie-accessible server context — proceed without token
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  if (options?.headers) {
    const incoming = options.headers as Record<string, string>;
    Object.assign(headers, incoming);
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      let errorMsg = `API error ${res.status}`;
      try {
        const json = JSON.parse(text) as { error?: string; message?: string };
        errorMsg = json.error ?? json.message ?? errorMsg;
      } catch {
        // non-JSON body — use status string
      }
      logger.error('apiFetch: request failed', { path, status: res.status, error: errorMsg });
      return { data: null, error: errorMsg };
    }

    const data = (await res.json()) as T;
    return { data, error: null };
  } catch (err) {
    logger.error('apiFetch: network error', { path, err });
    return { data: null, error: 'Network error. Please try again.' };
  }
}
