'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getBoutique } from '@/services/boutique';
import logger from '@/lib/logger';

interface FormValues {
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  zalo: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

const emptyForm: FormValues = {
  name: '',
  description: '',
  address: '',
  city: '',
  country: '',
  phone: '',
  email: '',
  zalo: '',
  website: '',
  instagram: '',
  facebook: '',
  tiktok: '',
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [form, setForm] = useState<FormValues>(emptyForm);
  const [pageLoading, setPageLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  const [pageError, setPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load boutique data on mount
  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          logger.error('ProfilePage: getUser failed', userError);
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
          logger.error('ProfilePage: profiles query failed', profileError);
          setPageError('Failed to load profile.');
          setPageLoading(false);
          return;
        }
        if (!profile?.boutique_id) {
          logger.warn('ProfilePage: boutique_id is null, redirecting to onboarding', { userId: user.id });
          router.replace('/onboarding');
          return;
        }

        const id = profile.boutique_id as string;
        setBoutiqueId(id);

        const { data: boutique, error: boutiqueError } = await getBoutique(supabase, id);
        if (boutiqueError || !boutique) {
          setPageError(boutiqueError ?? 'Failed to load boutique.');
          setPageLoading(false);
          return;
        }

        setForm({
          name: boutique.name ?? '',
          description: boutique.description ?? '',
          address: boutique.address ?? '',
          city: boutique.city ?? '',
          country: boutique.country ?? '',
          phone: boutique.phone ?? '',
          email: boutique.email ?? '',
          zalo: boutique.zalo ?? '',
          website: boutique.website ?? '',
          instagram: boutique.instagram ?? '',
          facebook: boutique.facebook ?? '',
          tiktok: boutique.tiktok ?? '',
        });

        if (boutique.logo_url) {
          setLogoUrl(boutique.logo_url);
          const { data: publicUrlData } = supabase.storage
            .from('boutique-logos')
            .getPublicUrl(boutique.logo_url);
          setLogoPreview(publicUrlData.publicUrl);
        }

        logger.info('ProfilePage: boutique loaded', { boutiqueId: id });
      } catch (err) {
        logger.error('ProfilePage: unexpected error during load', err);
        setPageError('An unexpected error occurred.');
      } finally {
        setPageLoading(false);
      }
    }

    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!boutiqueId) return;

    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        ...form,
        is_active: form.name.trim() !== '',
      };

      logger.info('ProfilePage: saving boutique', { boutiqueId, payload });

      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as { success?: boolean; error?: string };
      logger.info('ProfilePage: save response', { status: res.status, json });

      if (!res.ok || json.error) {
        setSaveError(json.error ?? 'Failed to save profile.');
      } else {
        setSaveSuccess(true);
        logger.info('ProfilePage: boutique saved', { boutiqueId });
      }
    } catch (err) {
      logger.error('ProfilePage: unexpected error during save', err);
      setSaveError('An unexpected error occurred.');
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !boutiqueId) return;

    setLogoLoading(true);
    setLogoError(null);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${boutiqueId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('boutique-logos')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        logger.error('ProfilePage: logo upload failed', uploadError);
        setLogoError(uploadError.message);
        setLogoLoading(false);
        return;
      }

      logger.info('ProfilePage: saving logo_url', { boutiqueId, path });

      const saveRes = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: path }),
      });

      const saveJson = await saveRes.json() as { success?: boolean; error?: string };
      logger.info('ProfilePage: logo save response', { status: saveRes.status, saveJson });

      if (!saveRes.ok || saveJson.error) {
        setLogoError(saveJson.error ?? 'Failed to save logo.');
        setLogoLoading(false);
        return;
      }

      setLogoUrl(path);
      const { data: publicUrlData } = supabase.storage
        .from('boutique-logos')
        .getPublicUrl(path);
      setLogoPreview(publicUrlData.publicUrl);

      logger.info('ProfilePage: logo uploaded', { boutiqueId, path });
    } catch (err) {
      logger.error('ProfilePage: unexpected error during logo upload', err);
      setLogoError('An unexpected error occurred.');
    } finally {
      setLogoLoading(false);
      // Reset the file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ─── Shared input/textarea class ────────────────────────────────────────────
  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition';
  const labelClass =
    'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5';

  // ─── Loading / error states ──────────────────────────────────────────────────
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
        <Link
          href="/dashboard"
          className="text-sm text-[#C9A96E] hover:text-[#b8945a] transition"
        >
          ← Dashboard
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Logo section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-base font-semibold text-gray-800 mb-6">Boutique Logo</h2>

          <div className="flex items-center gap-6">
            {/* Preview */}
            <div className="w-20 h-20 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt="Boutique logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">🏪</span>
              )}
            </div>

            {/* Upload */}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={logoLoading}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className={`inline-block px-5 py-2.5 rounded-xl border border-[#C9A96E] text-[#C9A96E] text-sm font-medium cursor-pointer hover:bg-[#C9A96E] hover:text-white transition ${
                  logoLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {logoLoading ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
              </label>
              {logoError && (
                <p className="mt-2 text-xs text-red-500">{logoError}</p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                PNG, JPG or WebP. Recommended: 400×400 px.
              </p>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1 — Boutique info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-base font-semibold text-gray-800 mb-6">Boutique Info</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Maison de Mariée"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Tell brides about your boutique…"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className={labelClass}>City</label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Ho Chi Minh City"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="country" className={labelClass}>Country</label>
                  <input
                    id="country"
                    name="country"
                    type="text"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="Vietnam"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className={labelClass}>Address</label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="123 Nguyen Hue, District 1"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Section 2 — Contact & social */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-base font-semibold text-gray-800 mb-6">Contact &amp; Social</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className={labelClass}>Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+84 90 123 4567"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="hello@yourboutique.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="zalo" className={labelClass}>Zalo</label>
                <input
                  id="zalo"
                  name="zalo"
                  type="text"
                  value={form.zalo}
                  onChange={handleChange}
                  placeholder="Zalo number or link"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="website" className={labelClass}>Website</label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={form.website}
                  onChange={handleChange}
                  placeholder="https://yourboutique.com"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="instagram" className={labelClass}>Instagram</label>
                  <input
                    id="instagram"
                    name="instagram"
                    type="text"
                    value={form.instagram}
                    onChange={handleChange}
                    placeholder="@yourboutique"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="facebook" className={labelClass}>Facebook</label>
                  <input
                    id="facebook"
                    name="facebook"
                    type="text"
                    value={form.facebook}
                    onChange={handleChange}
                    placeholder="facebook.com/yourboutique"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="tiktok" className={labelClass}>TikTok</label>
                  <input
                    id="tiktok"
                    name="tiktok"
                    type="text"
                    value={form.tiktok}
                    onChange={handleChange}
                    placeholder="@yourboutique"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between">
            <div>
              {saveError && (
                <p className="text-sm text-red-500">{saveError}</p>
              )}
              {saveSuccess && (
                <p className="text-sm text-green-600">Profile saved successfully.</p>
              )}
            </div>
            <button
              type="submit"
              disabled={saveLoading}
              className="px-8 py-3 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold tracking-wide hover:bg-[#b8945a] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {saveLoading ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
