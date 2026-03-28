import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

interface SaveProfileBody {
  name?: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  zalo?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  logo_url?: string | null;
  is_active?: boolean;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      logger.error('profile/save route: getUser failed', userError);
      return Response.json({ error: 'Not authenticated.' }, { status: 401 });
    }
    if (!user) {
      return Response.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    let body: SaveProfileBody;
    try {
      body = await request.json();
    } catch (err) {
      logger.error('profile/save route: failed to parse request body', err);
      return Response.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Resolve boutique_id from profiles — admin client bypasses RLS
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('boutique_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('profile/save route: profiles query failed', profileError);
      return Response.json({ error: 'Failed to load profile.' }, { status: 500 });
    }
    if (!profile?.boutique_id) {
      return Response.json({ error: 'No boutique linked to this account.' }, { status: 400 });
    }

    // boutiques has no user-level UPDATE RLS policy — admin client is required
    const { error: updateError } = await admin
      .from('boutiques')
      .update(body)
      .eq('id', profile.boutique_id);

    if (updateError) {
      logger.error('profile/save route: boutiques update failed', updateError);
      return Response.json({ error: 'Failed to save profile.' }, { status: 500 });
    }

    logger.info('profile/save route: boutique updated', { boutiqueId: profile.boutique_id });
    return Response.json({ success: true });
  } catch (error) {
    logger.error('[api/profile/save] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
