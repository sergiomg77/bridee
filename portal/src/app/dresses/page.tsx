import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { fetchBoutiqueDresses } from '@/services/dress';
import DressesView from './DressesView';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

export default async function DressesPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.error('DressesPage: getUser failed', userError);
    redirect('/login');
  }

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('boutique_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    logger.error('DressesPage: profiles query failed', profileError);
    redirect('/login');
  }

  if (!profile?.boutique_id) {
    logger.warn('DressesPage: no boutique_id on profile, redirecting to onboarding', { userId: user.id });
    redirect('/onboarding');
  }

  const boutiqueId = profile.boutique_id as string;

  const { data: dresses, error: dressesError } = await fetchBoutiqueDresses(
    supabase,
    boutiqueId
  );

  if (dressesError) {
    logger.error('DressesPage: fetchBoutiqueDresses failed', { error: dressesError });
  }

  return (
    <PortalLayout title="Dress Catalog">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800">Dress Catalog</h2>
          <p className="mt-1 text-sm text-gray-400">
            {dresses?.length ?? 0} dress{dresses?.length !== 1 ? 'es' : ''} in your boutique
          </p>
        </div>

        {dressesError ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-sm text-red-500">Failed to load dresses. Please refresh the page.</p>
          </div>
        ) : (
          <DressesView dresses={dresses ?? []} boutiqueId={boutiqueId} />
        )}
      </div>
    </PortalLayout>
  );
}
