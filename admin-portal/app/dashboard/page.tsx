import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { apiFetch } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

interface BoutiqueRow {
  id: string;
  status: string;
}

interface VendorRow {
  id: string;
  status: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    redirect('/login');
  }

  const token = session.access_token;

  const [boutiquesRes, vendorsRes] = await Promise.all([
    apiFetch<{ data: BoutiqueRow[] | null; error: string | null }>('/api/admin/boutiques', {}, token),
    apiFetch<{ data: VendorRow[] | null; error: string | null }>('/api/admin/vendors', {}, token),
  ]);

  const boutiques = boutiquesRes.data?.data ?? [];
  const vendors = vendorsRes.data?.data ?? [];

  const totalBoutiques = boutiques.length;
  const pendingBoutiques = boutiques.filter((b) => b.status === 'pending').length;
  const totalVendors = vendors.length;
  const pendingVendors = vendors.filter((v) => v.status === 'pending').length;

  const stats = [
    {
      label: 'Total Boutiques',
      value: totalBoutiques,
      pending: pendingBoutiques,
      href: '/boutiques',
      color: 'blue',
    },
    {
      label: 'Pending Boutiques',
      value: pendingBoutiques,
      pending: pendingBoutiques,
      href: '/boutiques',
      color: 'amber',
    },
    {
      label: 'Total Vendors',
      value: totalVendors,
      pending: pendingVendors,
      href: '/vendors',
      color: 'blue',
    },
    {
      label: 'Pending Vendors',
      value: pendingVendors,
      pending: pendingVendors,
      href: '/vendors',
      color: 'amber',
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition"
            >
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                {stat.label}
              </p>
              <p
                className={`text-3xl font-semibold ${
                  stat.color === 'amber' && stat.value > 0 ? 'text-amber-500' : 'text-gray-800'
                }`}
              >
                {stat.value}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
