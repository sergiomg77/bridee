import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

// All fields are valid v3 boutiques columns. No is_active, description, or logo_url.
interface SaveProfileBody {
  name?: string;
  about?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  zalo?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  logo_path?: string | null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    console.log('profile/save: called');
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log('profile/save: getUser', { userId: user?.id, error: userError?.message });

    if (userError) {
      logger.error('profile/save route: getUser failed', userError);
      return Response.json({ error: userError.message }, { status: 401 });
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

    console.log('profile/save: body received', body);

    const admin = createAdminClient();

    // v3: profiles has no boutique_id — resolve boutique via owner_user_id
    console.log('profile/save: querying boutique for user', user.id);
    const { data: boutique, error: boutiqueError } = await admin
      .from('boutiques')
      .select('id')
      .eq('owner_user_id', user.id)
      .limit(1)
      .single();

    console.log('profile/save: boutique query result', { boutiqueId: boutique?.id, error: boutiqueError?.message });

    if (boutiqueError) {
      logger.error('profile/save route: boutique query failed', boutiqueError);
      return Response.json({ error: boutiqueError.message }, { status: 500 });
    }
    if (!boutique) {
      return Response.json({ error: 'No boutique linked to this account.' }, { status: 400 });
    }

    // boutiques has no user-level UPDATE RLS policy — admin client required
    console.log('profile/save: updating boutique', boutique.id);
    const { error: updateError } = await admin
      .from('boutiques')
      .update(body)
      .eq('id', boutique.id);

    console.log('profile/save: update result', { error: updateError?.message });

    if (updateError) {
      logger.error('profile/save route: boutiques update failed', updateError);
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    logger.info('profile/save route: boutique updated', { boutiqueId: boutique.id });
    return Response.json({ success: true });
  } catch (err) {
    console.error('profile/save: unhandled exception', err);
    logger.error('profile/save route: unhandled exception', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
