import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

interface OnboardingBody {
  name: string;
  city?: string;
  country?: string;
}

export async function POST(request: Request): Promise<Response> {
  // Verify the caller is authenticated
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
    return Response.json({ error: 'Boutique name is required.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Insert the boutique row. boutiques has no user-level INSERT policy, so admin client is required.
  const { data: boutique, error: boutiqueError } = await admin
    .from('boutiques')
    .insert({
      name: name.trim(),
      city: city?.trim() || null,
      country: country?.trim() || null,
      email: user.email,
      is_active: false,
    })
    .select('id')
    .single();

  if (boutiqueError || !boutique) {
    logger.error('onboarding route: boutiques insert failed', boutiqueError);
    return Response.json({ error: 'Failed to create boutique.' }, { status: 500 });
  }

  // Link the profile to the new boutique
  const { error: profileError } = await admin
    .from('profiles')
    .update({ boutique_id: boutique.id })
    .eq('id', user.id);

  if (profileError) {
    logger.error('onboarding route: profiles update failed', profileError);
    return Response.json({ error: 'Failed to link boutique to profile.' }, { status: 500 });
  }

  logger.info('onboarding route: boutique setup complete', {
    userId: user.id,
    boutiqueId: boutique.id,
  });

  return Response.json({ boutiqueId: boutique.id });
}
