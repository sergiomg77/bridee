import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

interface AppointmentRow {
  id: string;
  status: string;
  full_name: string;
  appointment_slots: { slot_date: string; slot_time: string } | Array<{ slot_date: string; slot_time: string }> | null;
}

function getSlot(row: AppointmentRow): { slot_date: string; slot_time: string } | null {
  if (!row.appointment_slots) return null;
  return Array.isArray(row.appointment_slots)
    ? (row.appointment_slots[0] ?? null)
    : row.appointment_slots;
}

function formatSlotDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatSlotTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h ?? '0', 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('boutique_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    logger.error('DashboardPage: profiles query failed', profileError);
    redirect('/login');
  }
  if (!profile?.boutique_id) {
    redirect('/onboarding');
  }

  const boutiqueId = profile.boutique_id as string;
  const today = new Date().toISOString().split('T')[0] as string;

  // Parallel fetch: active dress count, unread messages, upcoming appointments
  const [dressResult, unreadResult, apptResult] = await Promise.all([
    supabase
      .from('boutique_dresses')
      .select('id', { count: 'exact', head: true })
      .eq('boutique_id', boutiqueId)
      .eq('is_active', true),

    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_user_id', user.id),

    supabase
      .from('appointments')
      .select('id, status, full_name, appointment_slots(slot_date, slot_time)')
      .eq('boutique_id', boutiqueId)
      .in('status', ['pending', 'confirmed'])
      .limit(20),
  ]);

  if (dressResult.error) {
    logger.error('DashboardPage: dress count query failed', dressResult.error);
  }
  if (unreadResult.error) {
    logger.error('DashboardPage: unread count query failed', unreadResult.error);
  }
  if (apptResult.error) {
    logger.error('DashboardPage: appointments query failed', apptResult.error);
  }

  const activeDressCount = dressResult.count ?? 0;
  const unreadCount = unreadResult.count ?? 0;

  const upcomingAppointments = ((apptResult.data ?? []) as AppointmentRow[])
    .filter((a) => {
      const slot = getSlot(a);
      return slot && slot.slot_date >= today;
    })
    .sort((a, b) => {
      const sa = getSlot(a);
      const sb = getSlot(b);
      if (!sa || !sb) return 0;
      return (
        sa.slot_date.localeCompare(sb.slot_date) ||
        sa.slot_time.localeCompare(sb.slot_time)
      );
    })
    .slice(0, 3);

  const STAT_CARDS = [
    {
      label: 'Active Dresses',
      value: activeDressCount,
      icon: '👗',
      href: '/dresses',
    },
    {
      label: 'Unread Messages',
      value: unreadCount,
      icon: '💬',
      href: '/inbox',
    },
    {
      label: 'Upcoming Appointments',
      value: upcomingAppointments.length,
      icon: '📅',
      href: '/appointments',
    },
  ] as const;

  const QUICK_ACTIONS = [
    { label: 'Add Dress', href: '/dresses/new', primary: true },
    { label: 'Set Availability', href: '/appointments', primary: false },
    { label: 'View Inbox', href: '/inbox', primary: false },
  ] as const;

  return (
    <PortalLayout title="Dashboard">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Welcome */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C9A96E]/10 flex items-center justify-center">
            <span className="text-base">💍</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Dashboard</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {/* Upcoming appointments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Upcoming Appointments
            </h3>
            <Link href="/appointments" className="text-xs text-[#C9A96E] hover:text-[#b8945a] font-medium transition">
              View all →
            </Link>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-sm text-gray-400">No upcoming appointments.</p>
              <Link
                href="/appointments"
                className="mt-3 inline-block text-xs text-[#C9A96E] hover:text-[#b8945a] font-medium transition"
              >
                Set your availability →
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
              {upcomingAppointments.map((appt) => {
                const slot = getSlot(appt);
                return (
                  <div key={appt.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">📅</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{appt.full_name}</p>
                        {slot && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatSlotDate(slot.slot_date)} at {formatSlotTime(slot.slot_time)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        appt.status === 'confirmed'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </PortalLayout>
  );
}
