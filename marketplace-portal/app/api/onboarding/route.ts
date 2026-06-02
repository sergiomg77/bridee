import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

interface OnboardingBody {
  name: string;
  city?: string;
  country?: string;
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    logger.error('onboarding route: getUser failed', userError);
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  if (!user) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let body: OnboardingBody;
  try {
    body = await request.json();
  } catch (err) {
    logger.error('onboarding route: failed to parse request body', err);
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { name, city, country } = body;

  if (!name?.trim()) {
    return Response.json({ error: 'Business name is required.' }, { status: 400 });
  }

  const slug =
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + user.id.slice(0, 6);

  const admin = createAdminClient();

  const { data: vendor, error: vendorError } = await admin
    .from('vendors')
    .insert({
      owner_user_id: user.id,
      name: name.trim(),
      slug,
      city: city?.trim() || null,
      country: country?.trim() || null,
      email: user.email,
      status: 'pending',
    })
    .select('id')
    .single();

  if (vendorError || !vendor) {
    logger.error('onboarding route: vendors insert failed', vendorError);
    return Response.json(
      { error: vendorError?.message ?? 'Failed to create vendor profile.' },
      { status: 500 }
    );
  }

  logger.info('onboarding route: vendor setup complete', {
    userId: user.id,
    vendorId: vendor.id,
  });

  return Response.json({ vendorId: vendor.id });
}
