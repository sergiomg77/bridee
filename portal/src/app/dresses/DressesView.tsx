'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { updateBoutiqueDress, softDeleteDress, type BoutiqueDressRow } from '@/services/dress';
import logger from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_BRIDEE_SUPABASE_URL!;

function getDressPhotoUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/dress-photos/${path}`;
}

interface DressesViewProps {
  dresses: BoutiqueDressRow[];
  boutiqueId: string;
}

export default function DressesView({ dresses: initialDresses, boutiqueId }: DressesViewProps) {
  const supabase = createClient();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [rows, setRows] = useState<BoutiqueDressRow[]>(initialDresses);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(dressId: string) {
    if (!confirm('Delete this dress? This cannot be undone.')) return;
    setDeletingId(dressId);
    const { error } = await softDeleteDress(supabase, dressId, boutiqueId);
    if (error) {
      logger.error('DressesView: soft delete failed', { dressId, error });
      alert(`Failed to delete dress: ${error}`);
    } else {
      setRows((prev) => prev.filter((r) => r.dress_id !== dressId));
    }
    setDeletingId(null);
  }

  async function handleToggleActive(row: BoutiqueDressRow) {
    setTogglingId(row.id);
    const { error } = await updateBoutiqueDress(supabase, row.id, {
      is_active: !row.is_active,
    });

    if (error) {
      logger.error('DressesView: toggle active failed', { id: row.id, error });
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r))
      );
    }
    setTogglingId(null);
  }

  const btnBase =
    'px-3 py-1.5 rounded-lg text-xs font-medium transition';

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          <button
            onClick={() => setView('grid')}
            className={`${btnBase} ${
              view === 'grid'
                ? 'bg-[#C9A96E] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setView('list')}
            className={`${btnBase} ${
              view === 'list'
                ? 'bg-[#C9A96E] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            List
          </button>
        </div>

        <Link
          href="/dresses/new"
          className="px-5 py-2.5 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold hover:bg-[#b8945a] transition"
        >
          + Add Dress
        </Link>
      </div>

      {rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">No dresses yet.</p>
          <Link
            href="/dresses/new"
            className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold hover:bg-[#b8945a] transition"
          >
            Add your first dress
          </Link>
        </div>
      )}

      {/* ─── Grid view ─────────────────────────────────────────────── */}
      {view === 'grid' && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {rows.map((row) => {
            const dress = row.dresses;
            if (!dress) return null;
            const coverPath = dress.dress_photos.find((p) => p.sort_order === 0)?.path ?? null;

            return (
              <div key={row.id} className="relative group">
                <Link
                  href={`/dresses/${dress.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-[#C9A96E]/30 transition"
                >
                  {/* Photo */}
                  <div className="aspect-[3/4] bg-gray-50 overflow-hidden">
                    {coverPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getDressPhotoUrl(coverPath)}
                        alt={dress.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">
                        👗
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{dress.title}</p>
                    {dress.designer && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{dress.designer}</p>
                    )}
                    {row.price !== null && (
                      <p className="text-xs text-[#C9A96E] font-medium mt-0.5">
                        ${Number(row.price).toLocaleString()}
                      </p>
                    )}
                    <span
                      className={`mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.is_active
                          ? 'bg-green-50 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {row.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </Link>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(dress.id)}
                  disabled={deletingId === dress.id}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-red-400 hover:bg-red-50 hover:text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                  title="Delete dress"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── List view ─────────────────────────────────────────────── */}
      {view === 'list' && rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-14">
                  Photo
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Color
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Price
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  Sizes
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => {
                const dress = row.dresses;
                if (!dress) return null;
                const coverPath = dress.dress_photos.find((p) => p.sort_order === 0)?.path ?? null;

                return (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition">
                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {coverPath ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getDressPhotoUrl(coverPath)}
                            alt={dress.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                            👗
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Title + Designer */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 truncate max-w-[180px]">
                        {dress.title}
                      </p>
                      {dress.designer && (
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">
                          {dress.designer}
                        </p>
                      )}
                    </td>

                    {/* Color */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {dress.color_code && (
                          <div
                            className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                            style={{ backgroundColor: dress.color_code }}
                          />
                        )}
                        <span className="text-gray-600 text-xs">{dress.color_name ?? '—'}</span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[#C9A96E] font-medium">
                        {row.price !== null ? `$${Number(row.price).toLocaleString()}` : '—'}
                      </span>
                    </td>

                    {/* Sizes */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {row.available_sizes?.length ? (
                          row.available_sizes.map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-xs"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          row.is_active
                            ? 'bg-green-50 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {row.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dresses/${dress.id}`}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#C9A96E] hover:text-[#C9A96E] transition"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleToggleActive(row)}
                          disabled={togglingId === row.id}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition disabled:opacity-50 ${
                            row.is_active
                              ? 'border-red-200 text-red-400 hover:bg-red-50'
                              : 'border-green-200 text-green-500 hover:bg-green-50'
                          }`}
                        >
                          {togglingId === row.id
                            ? '…'
                            : row.is_active
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(dress.id)}
                          disabled={deletingId === dress.id}
                          className="p-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                          title="Delete dress"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
