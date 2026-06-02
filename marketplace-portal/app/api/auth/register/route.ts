import { createAdminClient } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

interface RegisterRequestBody {
  email: string;
  password: string;
  businessName?: string;
}

export async function POST(request: Request): Promise<Response> {
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

    if (!email || !password) {
      return Response.json({ error: 'email and password are required.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Create auth user — email_confirm: false sends a confirmation email
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (authError || !authData.user) {
      logger.error('register route: createUser failed', authError);
      return Response.json(
        { error: authError?.message ?? 'Failed to create user.' },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 2. Insert profile row
    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, full_name: businessName ?? null });

    if (profileError) {
      logger.error('register route: profiles insert failed', profileError);
    }

    // 3. Insert vendor role into user_roles
    const { error: roleError } = await admin
      .from('user_roles')
      .insert({ user_id: userId, role: 'vendor' });

    if (roleError) {
      logger.error('register route: user_roles insert failed', roleError);
    }

    logger.info('register route: vendor registered successfully', { userId });
    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    logger.error('register route: unhandled exception', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
