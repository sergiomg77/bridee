import { createAdminClient } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

interface EnsureProfileBody {
  userId: string;
}

export async function POST(request: Request): Promise<Response> {
  let body: EnsureProfileBody;

  try {
    body = await request.json();
  } catch (err) {
    logger.error('ensure-profile route: failed to parse request body', err);
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { userId } = body;

  if (!userId) {
    return Response.json({ error: 'userId is required.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the user exists in auth before touching profiles
  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(userId);

  if (authError || !authUser.user) {
    logger.error('ensure-profile route: getUserById failed', authError);
    return Response.json({ error: 'User not found.' }, { status: 404 });
  }

  // Ensure profiles row exists (id only — role is not stored here)
  const { data: existingProfile, error: profileSelectError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profileSelectError) {
    logger.error('ensure-profile route: profiles select failed', profileSelectError);
    return Response.json({ error: 'Failed to check profile.' }, { status: 500 });
  }

  if (!existingProfile) {
    const { error: profileInsertError } = await admin
      .from('profiles')
      .insert({ id: userId });

    if (profileInsertError) {
      logger.error('ensure-profile route: profiles insert failed', profileInsertError);
      return Response.json({ error: 'Failed to create profile.' }, { status: 500 });
    }

    logger.info('ensure-profile route: profile created', { userId });
  }

  // Ensure user_roles row exists for 'vendor'
  const { data: existingRole, error: roleSelectError } = await admin
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'vendor')
    .maybeSingle();

  if (roleSelectError) {
    logger.error('ensure-profile route: user_roles select failed', roleSelectError);
    return Response.json({ error: 'Failed to check role.' }, { status: 500 });
  }

  if (!existingRole) {
    const { error: roleInsertError } = await admin
      .from('user_roles')
      .insert({ user_id: userId, role: 'vendor' });

    if (roleInsertError) {
      logger.error('ensure-profile route: user_roles insert failed', roleInsertError);
      return Response.json({ error: 'Failed to create role.' }, { status: 500 });
    }

    logger.info('ensure-profile route: vendor role created', { userId });
  }

  return Response.json({ success: true });
}
