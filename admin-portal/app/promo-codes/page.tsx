'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import logger from '@/lib/logger';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface AddForm {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: string;
  max_uses: string;
  expires_at: string;
}

export default function PromoCodesPage() {
  const router = useRouter();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<AddForm>({
    code: '',
    discount_type: 'percent',
    discount_value: '',
    max_uses: '',
    expires_at: '',
  });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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

    const { data, error: fetchError } = await apiFetch<{ data: PromoCode[] | null; error: string | null }>(
      '/api/admin/promo-codes',
      {},
      token,
    );

    if (fetchError || !data?.data) {
      logger.error('PromoCodesPage: fetch failed', { error: fetchError });
      setError(fetchError ?? 'Failed to load promo codes');
      setLoading(false);
      return;
    }

    setPromos(data.data);
    setLoading(false);
  }

  async function toggleActive(promo: PromoCode) {
    const token = await getToken();
    if (!token) return;

    const newActive = !promo.is_active;
    setPromos((prev) =>
      prev.map((p) => (p.id === promo.id ? { ...p, is_active: newActive } : p))
    );

    const { error: updateError } = await apiFetch(
      `/api/admin/promo-codes/${promo.id}`,
      { method: 'PATCH', body: JSON.stringify({ is_active: newActive }) },
      token,
    );

    if (updateError) {
      logger.error('PromoCodesPage: toggle active failed', { id: promo.id, error: updateError });
      setPromos((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: promo.is_active } : p))
      );
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    setAddError(null);
    const token = await getToken();
    if (!token) { setAddSaving(false); return; }

    const body: Record<string, unknown> = {
      code: addForm.code.toUpperCase(),
      discount_type: addForm.discount_type,
      discount_value: Number(addForm.discount_value),
    };
    if (addForm.max_uses) body.max_uses = Number(addForm.max_uses);
    if (addForm.expires_at) body.expires_at = addForm.expires_at;

    const { data, error: createError } = await apiFetch<{ data: PromoCode | null; error: string | null }>(
      '/api/admin/promo-codes',
      { method: 'POST', body: JSON.stringify(body) },
      token,
    );

    if (createError || !data?.data) {
      logger.error('PromoCodesPage: add failed', { error: createError });
      setAddError(createError ?? 'Failed to create promo code');
      setAddSaving(false);
      return;
    }

    setPromos((prev) => [data.data!, ...prev]);
    setAddForm({ code: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '' });
    setAddSaving(false);
  }

  const inputClass = 'px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent w-full';

  return (
    <AdminLayout title="Promo Codes">
      <div className="p-6 space-y-4">
        <form onSubmit={(e) => void handleAdd(e)} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700 mb-1">Create New Promo Code</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Code *</label>
              <input
                required
                value={addForm.code}
                onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                className={inputClass}
                placeholder="SUMMER20"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type *</label>
              <select
                value={addForm.discount_type}
                onChange={(e) => setAddForm((f) => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))}
                className={inputClass}
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Value *</label>
              <input
                required
                type="number"
                min={0}
                step={0.01}
                value={addForm.discount_value}
                onChange={(e) => setAddForm((f) => ({ ...f, discount_value: e.target.value }))}
                className={inputClass}
                placeholder="20"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Uses</label>
              <input
                type="number"
                min={1}
                value={addForm.max_uses}
                onChange={(e) => setAddForm((f) => ({ ...f, max_uses: e.target.value }))}
                className={inputClass}
                placeholder="Unlimited"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Expires At</label>
              <input
                type="date"
                value={addForm.expires_at}
                onChange={(e) => setAddForm((f) => ({ ...f, expires_at: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          {addError && (
            <p className="text-sm text-red-600">{addError}</p>
          )}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={addSaving}
              className="px-4 py-2 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold hover:bg-[#b8945a] disabled:opacity-60 transition"
            >
              {addSaving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Max Uses</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Used</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Expires</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {promos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-800">{p.code}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{p.discount_type}</td>
                    <td className="px-4 py-3 text-gray-800">
                      {p.discount_type === 'percent' ? `${p.discount_value}%` : `$${p.discount_value}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.max_uses ?? '∞'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.used_count}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void toggleActive(p)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${p.is_active ? 'bg-[#C9A96E]' : 'bg-gray-200'}`}
                        aria-label={p.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${p.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </td>
                  </tr>
                ))}
                {promos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                      No promo codes found.
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
