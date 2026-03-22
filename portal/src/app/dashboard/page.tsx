import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import logger from '@/lib/logger';

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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-[#C9A96E]/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">💍</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Welcome back
          </h2>
          <p className="text-gray-400 text-sm">{user.email}</p>
          <p className="mt-6 text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            Your boutique dashboard is being built. More features coming soon.
          </p>
        </div>
      </div>
    </main>
  );
}
