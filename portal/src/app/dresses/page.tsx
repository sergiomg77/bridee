import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { fetchBoutiqueDresses } from '@/services/dress';
import DressesView from './DressesView';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

export default async function DressesPage() {
  const supabase = await createClient();

  console.log('DressesPage: load started');

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log('DressesPage: getUser', { userId: user?.id, error: userError?.message });

  if (userError) {
    logger.error('DressesPage: getUser failed', userError);
    redirect('/login');
  }

  if (!user) {
    redirect('/login');
  }

  // v3: profiles has no boutique_id — query boutiques by owner_user_id
  console.log('DressesPage: querying boutique for user', user.id);
  const { data: boutique, error: boutiqueError } = await supabase
    .from('boutiques')
    .select('id')
    .eq('owner_user_id', user.id)
    .limit(1)
    .single();

  console.log('DressesPage: boutique result', { boutiqueId: boutique?.id, error: boutiqueError?.message });

  if (boutiqueError || !boutique) {
    logger.error('DressesPage: boutique query failed', boutiqueError);
    redirect('/login');
  }

  const boutiqueId = boutique.id;

  console.log('DressesPage: fetching dresses for boutique', boutiqueId);
  const { data: dresses, error: dressesError } = await fetchBoutiqueDresses(
    supabase,
    boutiqueId
  );

  console.log('DressesPage: fetchBoutiqueDresses result', { count: dresses?.length, error: dressesError });

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
