import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.error('DashboardPage: failed to get user', userError);
    redirect('/login');
  }
  if (!user) redirect('/login');

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle();

  if (vendorError) {
    logger.error('DashboardPage: vendors query failed', vendorError);
    redirect('/login');
  }
  if (!vendor) redirect('/onboarding');

  const vendorId = vendor.id as string;

  const [listingResult, unreadResult] = await Promise.all([
    supabase
      .from('vendor_listings')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('is_active', true),

    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_user_id', user.id),
  ]);

  if (listingResult.error) {
    logger.error('DashboardPage: listing count query failed', listingResult.error);
  }
  if (unreadResult.error) {
    logger.error('DashboardPage: unread count query failed', unreadResult.error);
  }

  const activeListingCount = listingResult.count ?? 0;
  const unreadCount = unreadResult.count ?? 0;

  const STAT_CARDS = [
    { label: 'Active Listings', value: activeListingCount, icon: '📋', href: '/listings' },
    { label: 'Unread Messages', value: unreadCount, icon: '💬', href: '/inbox' },
  ] as const;

  const QUICK_ACTIONS = [
    { label: 'Add Listing', href: '/listings/new', primary: true },
    { label: 'View Inbox', href: '/inbox', primary: false },
  ] as const;

  return (
    <PortalLayout title="Dashboard">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Welcome */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C9A96E]/10 flex items-center justify-center">
            <span className="text-base">🏪</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Dashboard</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STAT_CARDS.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4 hover:border-[#C9A96E]/40 hover:shadow-md transition"
            >
              <div className="w-12 h-12 rounded-xl bg-[#C9A96E]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#C9A96E]/20 transition">
                <span className="text-xl">{card.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                  action.primary
                    ? 'bg-[#C9A96E] text-white hover:bg-[#b8945a]'
                    : 'border border-gray-200 text-gray-700 hover:border-[#C9A96E] hover:text-[#C9A96E]'
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
