import { createAdminClient } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

interface RegisterRequestBody {
  email: string;
  password: string;
  inviteCode: string;
  businessName?: string;
}

export async function POST(request: Request): Promise<Response> {
  let body: RegisterRequestBody;

  try {
    body = await request.json();
  } catch (err) {
    logger.error('register route: failed to parse request body', err);
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email, password, inviteCode, businessName } = body;

  // 1. Validate invitation code
  if (inviteCode !== process.env.BRIDEE_BOUTIQUE_INVITE_CODE) {
    logger.warn('register route: invalid invitation code attempt', { email });
    return Response.json(
      { error: 'Invalid invitation code. Please contact Bridee.' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 2. Create auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    logger.error('register route: createUser failed', authError);
    return Response.json(
      { error: authError?.message ?? 'Failed to create user.' },
      { status: 400 }
    );
  }

  const userId = authData.user.id;

  // 3. Insert profile row
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: userId, full_name: businessName });

  if (profileError) {
    logger.error('register route: profiles insert failed', profileError);
    return Response.json(
      { error: 'Failed to create user profile.' },
      { status: 500 }
    );
  }

  // 4. Insert user_roles row
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role: 'boutique' });

  if (roleError) {
    logger.error('register route: user_roles insert failed', roleError);
    return Response.json(
      { error: 'Failed to assign user role.' },
      { status: 500 }
    );
  }

  // 5. Insert boutique row
  const boutiqueName = businessName?.trim() || email.split('@')[0];
  const slug =
    boutiqueName.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
    '-' +
    userId.slice(0, 6);
  const { data: boutiqueData, error: boutiqueError } = await supabase
    .from('boutiques')
    .insert({ name: boutiqueName, owner_user_id: userId, slug, zalo: '', status: 'pending' })
    .select('id')
    .single();

  if (boutiqueError || !boutiqueData) {
    logger.error('register route: boutiques insert failed', boutiqueError);
    return Response.json(
      { error: 'Failed to create boutique record.' },
      { status: 500 }
    );
  }

  logger.info('register route: boutique registered successfully', { userId, boutiqueId: boutiqueData.id });
  return Response.json({ success: true }, { status: 200 });
}
