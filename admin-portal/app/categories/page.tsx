'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import logger from '@/lib/logger';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface EditForm {
  name: string;
  slug: string;
  icon_name: string;
  sort_order: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', slug: '', icon_name: '', sort_order: '0' });
  const [editSaving, setEditSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<EditForm>({ name: '', slug: '', icon_name: '', sort_order: '0' });
  const [addSaving, setAddSaving] = useState(false);

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

    const { data, error: fetchError } = await apiFetch<{ data: Category[] | null; error: string | null }>(
      '/api/admin/categories',
      {},
      token,
    );

    if (fetchError || !data?.data) {
      logger.error('CategoriesPage: fetch failed', { error: fetchError });
      setError(fetchError ?? 'Failed to load categories');
      setLoading(false);
      return;
    }

    setCategories(data.data);
    setLoading(false);
  }

  async function toggleActive(cat: Category) {
    const token = await getToken();
    if (!token) return;

    const newActive = !cat.is_active;
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, is_active: newActive } : c))
    );

    const { error: updateError } = await apiFetch(
      `/api/admin/categories/${cat.id}`,
      { method: 'PATCH', body: JSON.stringify({ is_active: newActive }) },
      token,
    );

    if (updateError) {
      logger.error('CategoriesPage: toggle active failed', { id: cat.id, error: updateError });
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: cat.is_active } : c))
      );
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditForm({
      name: cat.name,
      slug: cat.slug,
      icon_name: cat.icon_name ?? '',
      sort_order: String(cat.sort_order),
    });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    const token = await getToken();
    if (!token) { setEditSaving(false); return; }

    const { data, error: updateError } = await apiFetch<{ data: Category | null; error: string | null }>(
      `/api/admin/categories/${editingId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: editForm.name,
          slug: editForm.slug,
          icon_name: editForm.icon_name || null,
          sort_order: Number(editForm.sort_order),
        }),
      },
      token,
    );

    if (updateError || !data?.data) {
      logger.error('CategoriesPage: save edit failed', { error: updateError });
      setEditSaving(false);
      return;
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === editingId ? data.data! : c))
    );
    setEditingId(null);
    setEditSaving(false);
  }

  async function saveAdd(e: FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    const token = await getToken();
    if (!token) { setAddSaving(false); return; }

    const { data, error: addError } = await apiFetch<{ data: Category | null; error: string | null }>(
      '/api/admin/categories',
      {
        method: 'POST',
        body: JSON.stringify({
          name: addForm.name,
          slug: addForm.slug,
          icon_name: addForm.icon_name || null,
          sort_order: Number(addForm.sort_order),
        }),
      },
      token,
    );

    if (addError || !data?.data) {
      logger.error('CategoriesPage: add failed', { error: addError });
      setAddSaving(false);
      return;
    }

    setCategories((prev) => [...prev, data.data!]);
    setAddForm({ name: '', slug: '', icon_name: '', sort_order: '0' });
    setShowAdd(false);
    setAddSaving(false);
  }

  const inputClass = 'px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent w-full';

  return (
    <AdminLayout title="Categories">
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="px-4 py-2 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold hover:bg-[#b8945a] transition"
          >
            {showAdd ? 'Cancel' : 'Add New Category'}
          </button>
        </div>

        {showAdd && (
          <form onSubmit={(e) => void saveAdd(e)} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700 mb-1">New Category</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                <input required value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Slug *</label>
                <input required value={addForm.slug} onChange={(e) => setAddForm((f) => ({ ...f, slug: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Icon Name</label>
                <input value={addForm.icon_name} onChange={(e) => setAddForm((f) => ({ ...f, icon_name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Sort Order</label>
                <input type="number" value={addForm.sort_order} onChange={(e) => setAddForm((f) => ({ ...f, sort_order: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="submit" disabled={addSaving} className="px-4 py-1.5 rounded-lg bg-[#C9A96E] text-white text-sm font-semibold hover:bg-[#b8945a] disabled:opacity-60 transition">
                {addSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}

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
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Slug</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Icon Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Active</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map((cat) => (
                  <>
                    <tr key={cat.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-500">{cat.sort_order}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                      <td className="px-4 py-3 text-gray-500">{cat.icon_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void toggleActive(cat)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${cat.is_active ? 'bg-[#C9A96E]' : 'bg-gray-200'}`}
                          aria-label={cat.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${cat.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => editingId === cat.id ? setEditingId(null) : startEdit(cat)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                        >
                          {editingId === cat.id ? 'Cancel' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                    {editingId === cat.id && (
                      <tr key={`${cat.id}-edit`}>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <form onSubmit={(e) => void saveEdit(e)} className="grid grid-cols-2 gap-3 max-w-lg">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Name</label>
                              <input required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Slug</label>
                              <input required value={editForm.slug} onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Icon Name</label>
                              <input value={editForm.icon_name} onChange={(e) => setEditForm((f) => ({ ...f, icon_name: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sort Order</label>
                              <input type="number" value={editForm.sort_order} onChange={(e) => setEditForm((f) => ({ ...f, sort_order: e.target.value }))} className={inputClass} />
                            </div>
                            <div className="col-span-2 flex justify-end gap-2 pt-1">
                              <button type="submit" disabled={editSaving} className="px-4 py-1.5 rounded-lg bg-[#C9A96E] text-white text-sm font-semibold hover:bg-[#b8945a] disabled:opacity-60 transition">
                                {editSaving ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                      No categories found.
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
