import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { fetchVendorListings } from '@/services/listing';
import ListingsView from './ListingsView';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

export default async function ListingsPage() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    logger.error('ListingsPage: getUser failed', userError);
    redirect('/login');
  }
  if (!user) redirect('/login');

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle();

  if (vendorError) {
    logger.error('ListingsPage: vendor query failed', vendorError);
    redirect('/login');
  }
  if (!vendor) redirect('/onboarding');

  const vendorId = (vendor as { id: string }).id;

  const { data: listings, error: listingsError } = await fetchVendorListings(supabase, vendorId);

  if (listingsError) {
    logger.error('ListingsPage: fetchVendorListings failed', { error: listingsError });
  }

  return (
    <PortalLayout title="My Listings">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <ListingsView listings={listings ?? []} vendorId={vendorId} hasError={!!listingsError} />
      </div>
    </PortalLayout>
  );
}
