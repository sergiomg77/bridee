'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import logger from '@/lib/logger';

interface Vendor {
  id: string;
  name: string;
  city: string | null;
  owner_email: string | null;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
}

type Status = 'pending' | 'active' | 'suspended';

const STATUS_BADGE: Record<Status, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
};

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getToken(): Promise<string | null> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return null;
    }
    return session.access_token;
  }

  async function load() {
    setLoading(true);
    const token = await getToken();
    if (!token) return;

    const { data, error: fetchError } = await apiFetch<{ data: Vendor[] | null; error: string | null }>(
      '/api/admin/vendors',
      {},
      token,
    );

    if (fetchError || !data?.data) {
      logger.error('VendorsPage: fetch failed', { error: fetchError });
      setError(fetchError ?? 'Failed to load vendors');
      setLoading(false);
      return;
    }

    setVendors(data.data);
    setLoading(false);
  }

  async function updateStatus(id: string, status: Status) {
    setUpdating(id);
    const token = await getToken();
    if (!token) return;

    const { error: updateError } = await apiFetch(
      `/api/admin/vendors/${id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      token,
    );

    if (updateError) {
      logger.error('VendorsPage: status update failed', { id, status, error: updateError });
      setUpdating(null);
      return;
    }

    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status } : v))
    );
    setUpdating(null);
  }

  return (
    <AdminLayout title="Vendors">
      <div className="p-6">
        {loading && (
          <p className="text-sm text-gray-400">Loading…</p>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}
        {!loading && !error && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">City</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Owner Email</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800">{v.name}</td>
                    <td className="px-4 py-3 text-gray-500">{v.city ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{v.owner_email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[v.status]}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={v.status === 'active' || updating === v.id}
                          onClick={() => void updateStatus(v.id, 'active')}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Approve
                        </button>
                        <button
                          disabled={v.status === 'suspended' || updating === v.id}
                          onClick={() => void updateStatus(v.id, 'suspended')}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Suspend
                        </button>
                        <button
                          disabled={v.status === 'pending' || updating === v.id}
                          onClick={() => void updateStatus(v.id, 'pending')}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Pending
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                      No vendors found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
