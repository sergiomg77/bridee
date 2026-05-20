import { createServerClient } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

interface RegisterRequestBody {
  email: string;
  password: string;
  inviteCode: string;
  businessName?: string;
}

export async function POST(request: Request): Promise<Response> {
  console.log('register route: called');
  logger.info('register route: called');
  try {
    let body: RegisterRequestBody;

    try {
      body = await request.json();
    } catch (err) {
      logger.error('register route: failed to parse request body', err);
      return Response.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { email, password, businessName } = body;

    // Invite code validation skipped for now

    // 1. Create user with standard signUp (not admin) so password works with signInWithPassword
    const supabase = createServerClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError || !authData.user) {
      logger.error('register route: signUp failed', authError);
      return Response.json(
        { error: authError?.message ?? 'Failed to create user.' },
        { status: 400 }
      );
    }

    const userId = authData.user.id;
    const admin = createAdminClient();

    // 2. Insert profile row (non-blocking)
    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, full_name: businessName });

    if (profileError) {
      logger.error('register route: profiles insert failed', profileError);
    }

    // 3. Insert user_roles row (non-blocking)
    const { error: roleError } = await admin
      .from('user_roles')
      .insert({ user_id: userId, role: 'boutique' });

    if (roleError) {
      logger.error('register route: user_roles insert failed', roleError);
    }

    // 4. Insert boutique row via admin client to bypass RLS (non-blocking)
    const boutiqueName = businessName?.trim() || email.split('@')[0];
    const slug =
      boutiqueName.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
      '-' +
      userId.slice(0, 6);
    const { error: boutiqueError } = await admin
      .from('boutiques')
      .insert({ name: boutiqueName, owner_user_id: userId, slug, zalo: '', status: 'pending' });

    if (boutiqueError) {
      logger.error('register route: boutiques insert failed', boutiqueError);
    }

    logger.info('register route: boutique registered successfully', { userId });
    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('register route: unhandled exception:', err);
    logger.error('register route: unhandled exception', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
