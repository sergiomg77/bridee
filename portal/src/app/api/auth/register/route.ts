import { createAdminClient } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

interface RegisterRequestBody {
  email: string;
  password: string;
  inviteCode: string;
}

export async function POST(request: Request): Promise<Response> {
  let body: RegisterRequestBody;

  try {
    body = await request.json();
  } catch (err) {
    logger.error('register route: failed to parse request body', err);
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email, password, inviteCode } = body;

  // 1. Validate invitation code
  if (inviteCode !== process.env.BOUTIQUE_INVITE_CODE) {
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

  // 3. Insert profile row (role = boutique, boutique_id to be set after)
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: userId, role: 'boutique' });

  if (profileError) {
    logger.error('register route: profiles insert failed', profileError);
    return Response.json(
      { error: 'Failed to create user profile.' },
      { status: 500 }
    );
  }

  // 4. Insert boutique row — use email prefix as placeholder name
  const boutiqueName = email.split('@')[0];
  const { data: boutiqueData, error: boutiqueError } = await supabase
    .from('boutiques')
    .insert({ name: boutiqueName, is_active: false })
    .select('id')
    .single();

  if (boutiqueError || !boutiqueData) {
    logger.error('register route: boutiques insert failed', boutiqueError);
    return Response.json(
      { error: 'Failed to create boutique record.' },
      { status: 500 }
    );
  }

  // 5. Link profile to boutique
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ boutique_id: boutiqueData.id })
    .eq('id', userId);

  if (profileUpdateError) {
    logger.error('register route: profiles boutique_id update failed', profileUpdateError);
    return Response.json(
      { error: 'Failed to link profile to boutique.' },
      { status: 500 }
    );
  }

  logger.info('register route: boutique registered successfully', { userId, boutiqueId: boutiqueData.id });
  return Response.json({ success: true }, { status: 200 });
}
