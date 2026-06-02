'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { fetchListing } from '@/services/listing';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

interface Category {
  id: string;
  name: string;
}

interface VendorEnvelope {
  data: { id: string };
  error: string | null;
}

interface CategoriesEnvelope {
  data: Category[];
  error: string | null;
}

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id;
  const listingId = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');

  const supabase = createClient();

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [listingTitle, setListingTitle] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeToggling, setActiveToggling] = useState(false);

  useEffect(() => {
    if (!listingId) {
      setPageError('Invalid listing ID.');
      setPageLoading(false);
      return;
    }

    async function load() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          setPageError('Not authenticated.');
          setPageLoading(false);
          return;
        }

        const t = session.access_token;
        setToken(t);

        const [vendorResult, catsResult, listingResult] = await Promise.all([
          apiFetch<VendorEnvelope>('/api/vendors/me', undefined, t),
          apiFetch<CategoriesEnvelope>('/api/marketplace/categories', undefined, t),
          fetchListing(supabase, listingId),
        ]);

        if (vendorResult.error || !vendorResult.data?.data?.id) {
          setPageError(vendorResult.error ?? 'Failed to load vendor profile.');
          setPageLoading(false);
          return;
        }

        setVendorId(vendorResult.data.data.id);

        if (!catsResult.error && catsResult.data?.data) {
          setCategories(catsResult.data.data);
        }

        if (listingResult.error || !listingResult.data) {
          setPageError(listingResult.error ?? 'Listing not found.');
          setPageLoading(false);
          return;
        }

        const listing = listingResult.data;
        setListingTitle(listing.title);
        setTitle(listing.title);
        setDescription(listing.description ?? '');
        setCity(listing.city ?? '');
        setCategoryId(listing.category_id);
        setIsActive(listing.is_active);

        logger.info('EditListingPage: listing loaded', { listingId });
      } catch (err) {
        logger.error('EditListingPage: unexpected error during load', err);
        setPageError('An unexpected error occurred.');
      } finally {
        setPageLoading(false);
      }
    }

    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  async function handleActiveToggle() {
    if (!vendorId) return;
    setActiveToggling(true);
    const newActive = !isActive;

    const result = await apiFetch(
      `/api/vendors/${vendorId}/listings/${listingId}`,
      { method: 'PUT', body: JSON.stringify({ is_active: newActive }) },
      token
    );

    if (result.error) {
      logger.error('EditListingPage: toggle active failed', { error: result.error });
    } else {
      setIsActive(newActive);
    }

    setActiveToggling(false);
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vendorId) return;

    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const result = await apiFetch(
        `/api/vendors/${vendorId}/listings/${listingId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            category_id: categoryId,
            title,
            description: description || undefined,
            city: city || undefined,
            is_active: isActive,
          }),
        },
        token
      );

      if (result.error) {
        setSaveError(result.error);
      } else {
        setListingTitle(title);
        setSaveSuccess(true);
        logger.info('EditListingPage: listing updated', { listingId });
      }
    } catch (err) {
      logger.error('EditListingPage: unexpected error during save', err);
      setSaveError('An unexpected error occurred.');
    } finally {
      setSaveLoading(false);
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition';
  const selectClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition';
  const labelClass =
    'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5';

  if (pageLoading) {
    return (
      <PortalLayout title="Edit Listing">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </PortalLayout>
    );
  }

  if (pageError) {
    return (
      <PortalLayout title="Edit Listing">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-red-500">{pageError}</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title={listingTitle || 'Edit Listing'}>
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header bar */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 truncate">{listingTitle}</h2>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <Link
              href={`/listings/${listingId}/photos`}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#C9A96E] hover:text-[#C9A96E] transition"
            >
              Manage Photos
            </Link>
            <Link
              href={`/listings/${listingId}/packages`}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#C9A96E] hover:text-[#C9A96E] transition"
            >
              Manage Packages
            </Link>
            <span className="text-xs text-gray-500 font-medium">
              {isActive ? 'Active' : 'Inactive'}
            </span>
            <button
              type="button"
              onClick={handleActiveToggle}
              disabled={activeToggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                isActive ? 'bg-[#C9A96E]' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-base font-semibold text-gray-800 mb-6">Basic Info</h3>
            <div className="space-y-4">

              <div>
                <label htmlFor="title" className={labelClass}>
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="title" type="text" required
                  value={title} onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  placeholder="e.g. Bridal Dress Rental Package"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="description" className={labelClass}>Description</label>
                <textarea
                  id="description" rows={4}
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you offer…"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label htmlFor="city" className={labelClass}>City</label>
                <input
                  id="city" type="text"
                  value={city} onChange={(e: ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
                  placeholder="Ho Chi Minh City"
                  className={inputClass}
                />
              </div>

            </div>
          </div>

          {/* Category */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-base font-semibold text-gray-800 mb-6">Category</h3>
            <div>
              <label htmlFor="category" className={labelClass}>
                Category <span className="text-red-400">*</span>
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className={selectClass}
              >
                <option value="">— Select a category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-base font-semibold text-gray-800 mb-6">Status</h3>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Active listing</p>
                <p className="text-xs text-gray-400 mt-0.5">Toggle updates immediately without saving</p>
              </div>
              <button
                type="button"
                onClick={handleActiveToggle}
                disabled={activeToggling}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                  isActive ? 'bg-[#C9A96E]' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between">
            <div>
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              {saveSuccess && <p className="text-sm text-green-600">Changes saved.</p>}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/listings')}
                className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="px-8 py-3 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold tracking-wide hover:bg-[#b8945a] disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {saveLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </PortalLayout>
  );
}
