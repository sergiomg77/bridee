import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import logger from '@/lib/logger';

const NAV_CARDS = [
  {
    href: '/profile',
    icon: '🏪',
    title: 'Profile',
    description: 'Set up your boutique name, location, contact details, and logo.',
    enabled: true,
  },
  {
    href: '/dresses',
    icon: '👗',
    title: 'Dress Catalog',
    description: 'Add and manage the dresses brides will discover in the app.',
    enabled: true,
  },
  {
    href: null,
    icon: '💌',
    title: 'Leads',
    description: 'View brides who liked your dresses and expressed interest.',
    enabled: false,
  },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error('DashboardPage: failed to get user', error);
    redirect('/login');
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-light tracking-[0.15em] text-gray-800 uppercase">
          Bridee <span className="text-[#C9A96E]">Partner</span>
        </h1>
        <span className="text-sm text-gray-400">{user.email}</span>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#C9A96E]/10 flex items-center justify-center">
              <span className="text-base">💍</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Welcome back</h2>
          </div>
          <p className="text-sm text-gray-400 ml-11">{user.email}</p>
        </div>

        {/* Nav cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {NAV_CARDS.map((card) =>
            card.enabled ? (
              <Link
                key={card.title}
                href={card.href}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col hover:border-[#C9A96E]/40 hover:shadow-md transition"
              >
                <div className="w-11 h-11 rounded-xl bg-[#C9A96E]/10 flex items-center justify-center mb-4 group-hover:bg-[#C9A96E]/20 transition">
                  <span className="text-xl">{card.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">{card.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{card.description}</p>
                </div>
                <div className="mt-5 flex items-center gap-1 text-xs font-medium text-[#C9A96E] group-hover:gap-2 transition-all">
                  Open <span>→</span>
                </div>
              </Link>
            ) : (
              <div
                key={card.title}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col opacity-50 cursor-not-allowed"
              >
                <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                  <span className="text-xl">{card.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">{card.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{card.description}</p>
                </div>
                <div className="mt-5 text-xs font-medium text-gray-300">
                  Coming soon
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}
