import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

interface SaveProfileBody {
  name?: string;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  zalo?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  logo_path?: string | null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

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

    const admin = createAdminClient();

    const { data: vendor, error: vendorError } = await admin
      .from('vendors')
      .select('id')
      .eq('owner_user_id', user.id)
      .limit(1)
      .single();

    if (vendorError) {
      logger.error('profile/save route: vendor query failed', vendorError);
      return Response.json({ error: vendorError.message }, { status: 500 });
    }
    if (!vendor) {
      return Response.json({ error: 'No vendor profile linked to this account.' }, { status: 400 });
    }

    // Build update from only valid vendor fields
    const updates: Record<string, unknown> = {};
    const { name, description, city, country, phone, email, zalo, website, instagram, facebook, tiktok, logo_path } = body;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (city !== undefined) updates.city = city;
    if (country !== undefined) updates.country = country;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (zalo !== undefined) updates.zalo = zalo;
    if (website !== undefined) updates.website = website;
    if (instagram !== undefined) updates.instagram = instagram;
    if (facebook !== undefined) updates.facebook = facebook;
    if (tiktok !== undefined) updates.tiktok = tiktok;
    if (logo_path !== undefined) updates.logo_path = logo_path;

    const { error: updateError } = await admin
      .from('vendors')
      .update(updates)
      .eq('id', (vendor as { id: string }).id);

    if (updateError) {
      logger.error('profile/save route: vendors update failed', updateError);
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    logger.info('profile/save route: vendor updated', { vendorId: (vendor as { id: string }).id });
    return Response.json({ success: true });
  } catch (err) {
    logger.error('profile/save route: unhandled exception', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
