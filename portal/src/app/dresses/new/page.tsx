'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  createDress,
  createBoutiqueDress,
} from '@/services/dress';
import logger from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

interface DressFormState {
  title: string;
  subtitle: string;
  long_description: string;
  color_name: string;
  color_code: string;
  style_tags: string; // comma-separated in UI
  price: string;
  available_sizes: string[];
  is_active: boolean;
}

const emptyForm: DressFormState = {
  title: '',
  subtitle: '',
  long_description: '',
  color_name: '',
  color_code: '#FFFFFF',
  style_tags: '',
  price: '',
  available_sizes: [],
  is_active: false,
};

export default function NewDressPage() {
  const router = useRouter();
  const supabase = createClient();

  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [form, setForm] = useState<DressFormState>(emptyForm);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          logger.error('NewDressPage: getUser failed', userError);
          setPageError('Failed to load session.');
          setPageLoading(false);
          return;
        }
        if (!user) {
          setPageError('Not authenticated.');
          setPageLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('boutique_id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          logger.error('NewDressPage: profiles query failed', profileError);
          setPageError('Failed to load profile.');
          setPageLoading(false);
          return;
        }
        if (!profile?.boutique_id) {
          setPageError('No boutique linked to this account.');
          setPageLoading(false);
          return;
        }

        setBoutiqueId(profile.boutique_id as string);
      } catch (err) {
        logger.error('NewDressPage: unexpected error during session load', err);
        setPageError('An unexpected error occurred.');
      } finally {
        setPageLoading(false);
      }
    }

    void loadSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSizeToggle(size: string) {
    setForm((prev) => ({
      ...prev,
      available_sizes: prev.available_sizes.includes(size)
        ? prev.available_sizes.filter((s) => s !== size)
        : [...prev.available_sizes, size],
    }));
  }

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !boutiqueId) return;

    setPhotoLoading(true);
    setPhotoError(null);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${boutiqueId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from('dress-photos')
        .upload(path, file, { upsert: false });

      if (uploadError) {
        logger.error('NewDressPage: photo upload failed', uploadError);
        setPhotoError(uploadError.message);
        setPhotoLoading(false);
        return;
      }

      setImagePath(path);
      setImagePreview(`${SUPABASE_URL}/storage/v1/object/public/dress-photos/${path}`);
      logger.info('NewDressPage: photo uploaded', { path });
    } catch (err) {
      logger.error('NewDressPage: unexpected error during photo upload', err);
      setPhotoError('An unexpected error occurred during upload.');
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!boutiqueId) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      const styleTags = form.style_tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { data: dress, error: dressError } = await createDress(supabase, {
        title: form.title,
        subtitle: form.subtitle || undefined,
        long_description: form.long_description || undefined,
        color_name: form.color_name || undefined,
        color_code: form.color_code || undefined,
        style_tags: styleTags,
        image_path: imagePath ?? undefined,
      });

      if (dressError || !dress) {
        setSaveError(dressError ?? 'Failed to create dress.');
        setSaveLoading(false);
        return;
      }

      const price = form.price ? parseFloat(form.price) : 0;

      const { error: bdError } = await createBoutiqueDress(supabase, dress.id, boutiqueId, {
        price,
        available_sizes: form.available_sizes,
        is_active: form.is_active,
      });

      if (bdError) {
        setSaveError(bdError);
        setSaveLoading(false);
        return;
      }

      logger.info('NewDressPage: dress created', { dressId: dress.id, boutiqueId });
      router.push('/dresses');
    } catch (err) {
      logger.error('NewDressPage: unexpected error during save', err);
      setSaveError('An unexpected error occurred.');
      setSaveLoading(false);
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition';
  const labelClass =
    'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5';

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <p className="text-sm text-red-500">{pageError}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-light tracking-[0.15em] text-gray-800 uppercase">
          Bridee <span className="text-[#C9A96E]">Partner</span>
        </h1>
        <Link href="/dresses" className="text-sm text-[#C9A96E] hover:text-[#b8945a] transition">
          ← Back to Dresses
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold text-gray-800 mb-8">Add New Dress</h2>

        {/* Photo upload */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <h3 className="text-base font-semibold text-gray-800 mb-6">Dress Photo</h3>

          {imagePreview && (
            <div className="mb-4 rounded-xl overflow-hidden aspect-[3/4] max-w-[200px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Dress preview" className="w-full h-full object-cover" />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={photoLoading}
            className="hidden"
            id="dress-photo"
          />
          <label
            htmlFor="dress-photo"
            className={`inline-block px-5 py-2.5 rounded-xl border border-[#C9A96E] text-[#C9A96E] text-sm font-medium cursor-pointer hover:bg-[#C9A96E] hover:text-white transition ${
              photoLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {photoLoading ? 'Uploading…' : imagePath ? 'Change Photo' : 'Upload Photo'}
          </label>
          {photoError && <p className="mt-2 text-xs text-red-500">{photoError}</p>}
          <p className="mt-2 text-xs text-gray-400">PNG, JPG or WebP. Portrait orientation recommended.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1 — Dress details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-base font-semibold text-gray-800 mb-6">Dress Details</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className={labelClass}>
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Ivory Lace A-Line"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="subtitle" className={labelClass}>Subtitle</label>
                <input
                  id="subtitle"
                  name="subtitle"
                  type="text"
                  value={form.subtitle}
                  onChange={handleChange}
                  placeholder="Soft tulle with delicate lace appliqué"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="long_description" className={labelClass}>Description</label>
                <textarea
                  id="long_description"
                  name="long_description"
                  rows={4}
                  value={form.long_description}
                  onChange={handleChange}
                  placeholder="Describe the dress in detail…"
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="color_name" className={labelClass}>Color Name</label>
                  <input
                    id="color_name"
                    name="color_name"
                    type="text"
                    value={form.color_name}
                    onChange={handleChange}
                    placeholder="Ivory"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="color_code" className={labelClass}>Color Code</label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl border border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: form.color_code || '#FFFFFF' }}
                    />
                    <input
                      id="color_code"
                      name="color_code"
                      type="text"
                      value={form.color_code}
                      onChange={handleChange}
                      placeholder="#FFFFF0"
                      className={`${inputClass} flex-1`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="style_tags" className={labelClass}>Style Tags</label>
                <input
                  id="style_tags"
                  name="style_tags"
                  type="text"
                  value={form.style_tags}
                  onChange={handleChange}
                  placeholder="romantic, boho, lace, vintage"
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-gray-400">Comma-separated, e.g. romantic, boho, lace</p>
              </div>
            </div>
          </div>

          {/* Section 2 — Boutique listing */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-base font-semibold text-gray-800 mb-6">Boutique Listing</h3>

            <div className="space-y-5">
              <div>
                <label htmlFor="price" className={labelClass}>Price</label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>

              <div>
                <p className={labelClass}>Available Sizes</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleSizeToggle(size)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                        form.available_sizes.includes(size)
                          ? 'bg-[#C9A96E] border-[#C9A96E] text-white'
                          : 'border-gray-200 text-gray-500 hover:border-[#C9A96E] hover:text-[#C9A96E]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Active listing</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Active dresses are visible to brides in the app
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.is_active ? 'bg-[#C9A96E]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between">
            {saveError && <p className="text-sm text-red-500">{saveError}</p>}
            {!saveError && <span />}
            <button
              type="submit"
              disabled={saveLoading}
              className="px-8 py-3 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold tracking-wide hover:bg-[#b8945a] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {saveLoading ? 'Saving…' : 'Save Dress'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
