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

  const supabase = createAdminClient();

  // Verify the user exists in auth before touching profiles
  const { data: authUser, error: authError } =
    await supabase.auth.admin.getUserById(userId);

  if (authError || !authUser.user) {
    logger.error('ensure-profile route: getUserById failed', authError);
    return Response.json({ error: 'User not found.' }, { status: 404 });
  }

  // Check whether a profile row already exists
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (selectError) {
    logger.error('ensure-profile route: profiles select failed', selectError);
    return Response.json({ error: 'Failed to check profile.' }, { status: 500 });
  }

  if (existing) {
    // Profile already exists — nothing to do
    return Response.json({ success: true });
  }

  // Create the missing profile row
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({ id: userId, role: 'boutique' });

  if (insertError) {
    logger.error('ensure-profile route: profiles insert failed', insertError);
    return Response.json({ error: 'Failed to create profile.' }, { status: 500 });
  }

  logger.info('ensure-profile route: profile created', { userId });
  return Response.json({ success: true });
}
