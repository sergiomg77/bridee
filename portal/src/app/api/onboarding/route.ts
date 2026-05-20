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

  // v3: boutiques linked via owner_user_id, no is_active column, status is 'pending' by default
  const slug =
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + user.id.slice(0, 6);

  console.log('onboarding route: inserting boutique', { userId: user.id, slug });

  const { data: boutique, error: boutiqueError } = await admin
    .from('boutiques')
    .insert({
      owner_user_id: user.id,
      name: name.trim(),
      slug,
      city: city?.trim() || null,
      country: country?.trim() || null,
      email: user.email,
      status: 'pending',
      zalo: '',
    })
    .select('id')
    .single();

  console.log('onboarding route: boutique insert result', { boutiqueId: boutique?.id, error: boutiqueError?.message });

  if (boutiqueError || !boutique) {
    logger.error('onboarding route: boutiques insert failed', boutiqueError);
    return Response.json({ error: boutiqueError?.message ?? 'Failed to create boutique.' }, { status: 500 });
  }

  // v3: profiles has no boutique_id — boutique is linked via owner_user_id, no profile update needed

  logger.info('onboarding route: boutique setup complete', {
    userId: user.id,
    boutiqueId: boutique.id,
  });

  console.log('onboarding route: complete', { userId: user.id, boutiqueId: boutique.id });
  return Response.json({ boutiqueId: boutique.id });
}
