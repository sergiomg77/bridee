'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
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

interface ListingEnvelope {
  data: { id: string };
  error: string | null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function NewListingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function init() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          setPageError('Not authenticated.');
          setPageLoading(false);
          return;
        }

        const t = session.access_token;
        setToken(t);

        const [vendorResult, catsResult] = await Promise.all([
          apiFetch<VendorEnvelope>('/api/vendors/me', undefined, t),
          apiFetch<CategoriesEnvelope>('/api/marketplace/categories', undefined, t),
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
      } catch (err) {
        logger.error('NewListingPage: init error', err);
        setPageError('An unexpected error occurred.');
      } finally {
        setPageLoading(false);
      }
    }
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vendorId) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      const result = await apiFetch<ListingEnvelope>(
        `/api/vendors/${vendorId}/listings`,
        {
          method: 'POST',
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

      if (result.error || !result.data?.data?.id) {
        setSaveError(result.error ?? 'Failed to create listing.');
        setSaveLoading(false);
        return;
      }

      const listingId = result.data.data.id;

      if (photoFile) {
        try {
          const base64 = await fileToBase64(photoFile);
          await apiFetch(
            `/api/vendors/${vendorId}/listings/${listingId}/photos`,
            {
              method: 'POST',
              body: JSON.stringify({ image_base64: base64, is_cover: true, sort_order: 0 }),
            },
            token
          );
        } catch (photoErr) {
          logger.error('NewListingPage: cover photo upload failed', photoErr);
        }
      }

      logger.info('NewListingPage: listing created', { listingId });
      router.push(`/listings/${listingId}`);
    } catch (err) {
      logger.error('NewListingPage: unexpected error during save', err);
      setSaveError('An unexpected error occurred.');
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
      <PortalLayout title="New Listing">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </PortalLayout>
    );
  }

  if (pageError) {
    return (
      <PortalLayout title="New Listing">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-red-500">{pageError}</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="New Listing">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold text-gray-800 mb-8">New Listing</h2>

        {/* Cover Photo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <h3 className="text-base font-semibold text-gray-800 mb-6">Cover Photo</h3>

          {imagePreview && (
            <div className="mb-4 rounded-xl overflow-hidden aspect-video max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
            id="cover-photo"
          />
          <label
            htmlFor="cover-photo"
            className="inline-block px-5 py-2.5 rounded-xl border border-[#C9A96E] text-[#C9A96E] text-sm font-medium cursor-pointer hover:bg-[#C9A96E] hover:text-white transition"
          >
            {photoFile ? 'Change Photo' : 'Upload Photo'}
          </label>
          <p className="mt-2 text-xs text-gray-400">PNG, JPG or WebP. Optional — can add more photos after creating.</p>
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
                  value={title} onChange={(e) => setTitle(e.target.value)}
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
                  value={city} onChange={(e) => setCity(e.target.value)}
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
                <p className="text-xs text-gray-400 mt-0.5">Active listings are visible to customers</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
            {saveError ? (
              <p className="text-sm text-red-500">{saveError}</p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={saveLoading}
              className="px-8 py-3 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold tracking-wide hover:bg-[#b8945a] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {saveLoading ? 'Creating…' : 'Create Listing'}
            </button>
          </div>

        </form>
      </div>
    </PortalLayout>
  );
}
