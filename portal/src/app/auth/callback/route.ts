// =============================================================================
// Supabase Auth Callback Handler
//
// Supabase redirects here after email confirmation with a one-time `code`.
// This route exchanges the code for a session and sets the auth cookies.
//
// REQUIRED — Supabase dashboard setup (Authentication → URL Configuration):
//   Site URL:      http://localhost:3000
//   Redirect URLs: http://localhost:3000/auth/callback
//
// When deploying to production, add the production equivalents alongside the
// localhost entries above (e.g. https://app.bridee.com/auth/callback).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (!code) {
    logger.error('auth/callback: request arrived with no code parameter');
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    logger.error('auth/callback: exchangeCodeForSession failed', error);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  logger.info('auth/callback: session established', { userId: data.user.id });

  // Ensure a profile row exists for this user. Uses the admin client because
  // the profiles table has no RLS INSERT policy for authenticated users.
  const admin = createAdminClient();

  const { data: existing, error: selectError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (selectError) {
    logger.error('auth/callback: profiles select failed', selectError);
    // Non-fatal — redirect to dashboard and let the next request retry
  } else if (!existing) {
    const { error: insertError } = await admin
      .from('profiles')
      .insert({ id: data.user.id, role: 'boutique' });

    if (insertError) {
      logger.error('auth/callback: profiles insert failed', insertError);
      // Non-fatal — same reasoning above
    } else {
      logger.info('auth/callback: profile created', { userId: data.user.id });
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
