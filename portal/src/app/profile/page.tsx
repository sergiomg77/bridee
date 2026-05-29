'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { createClient } from '@/lib/supabase';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_BRIDEE_SUPABASE_URL!;

interface FormValues {
  name: string;
  about: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  zalo: string;
  whatsapp: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

const COUNTRIES = ['Vietnam', 'Japan'] as const;

const CITIES: Record<string, string[]> = {
  Vietnam: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Can Tho', 'Hai Phong'],
  Japan: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo'],
};

const emptyForm: FormValues = {
  name: '',
  about: '',
  address: '',
  city: 'Hanoi',
  country: 'Vietnam',
  phone: '',
  email: '',
  zalo: '',
  whatsapp: '',
  website: '',
  instagram: '',
  facebook: '',
  tiktok: '',
};

export default function ProfilePage() {
  const supabase = createClient();

  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
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

  useEffect(() => {
    async function load() {
      try {
        console.log('ProfilePage: load started');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('ProfilePage: getUser', { userId: user?.id, error: userError?.message });
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

        // v3: profiles has no boutique_id — query boutiques by owner_user_id directly
        console.log('ProfilePage: querying boutique for user', user.id);
        const { data: boutique, error: boutiqueError } = await supabase
          .from('boutiques')
          .select('*')
          .eq('owner_user_id', user.id)
          .limit(1)
          .single();

        console.log('ProfilePage: boutique result', { boutiqueId: boutique?.id, error: boutiqueError?.message });

        if (boutiqueError || !boutique) {
          logger.error('ProfilePage: boutique query failed', boutiqueError);
          setPageError(boutiqueError?.message ?? 'Failed to load boutique.');
          setPageLoading(false);
          return;
        }

        setBoutiqueId(boutique.id);

        setForm({
          name: boutique.name ?? '',
          about: boutique.about ?? '',
          address: boutique.address ?? '',
          city: boutique.city || 'Hanoi',
          country: boutique.country || 'Vietnam',
          phone: boutique.phone ?? '',
          email: boutique.email ?? '',
          zalo: boutique.zalo ?? '',
          whatsapp: boutique.whatsapp ?? '',
          website: boutique.website ?? '',
          instagram: boutique.instagram ?? '',
          facebook: boutique.facebook ?? '',
          tiktok: boutique.tiktok ?? '',
        });

        if (boutique.logo_path) {
          setLogoPath(boutique.logo_path);
          setLogoPreview(`${SUPABASE_URL}/storage/v1/object/public/boutique-logos/${boutique.logo_path}`);
        }

        console.log('ProfilePage: boutique loaded successfully', { boutiqueId: boutique.id });
        logger.info('ProfilePage: boutique loaded', { boutiqueId: boutique.id });
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
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
      const payload = { ...form };

      logger.info('ProfilePage: saving boutique', { boutiqueId, payload });

      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as { success?: boolean; error?: string };

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

      logger.info('ProfilePage: saving logo_path', { boutiqueId, path });

      const saveRes = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_path: path }),
      });

      const saveJson = await saveRes.json() as { success?: boolean; error?: string };

      if (!saveRes.ok || saveJson.error) {
        setLogoError(saveJson.error ?? 'Failed to save logo.');
        setLogoLoading(false);
        return;
      }

      setLogoPath(path);
      setLogoPreview(`${SUPABASE_URL}/storage/v1/object/public/boutique-logos/${path}`);

      logger.info('ProfilePage: logo uploaded', { boutiqueId, path });
    } catch (err) {
      logger.error('ProfilePage: unexpected error during logo upload', err);
      setLogoError('An unexpected error occurred.');
    } finally {
      setLogoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition';
  const labelClass =
    'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5';

  if (pageLoading) {
    return (
      <PortalLayout title="Boutique Profile">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </PortalLayout>
    );
  }

  if (pageError) {
    return (
      <PortalLayout title="Boutique Profile">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-red-500">{pageError}</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Boutique Profile">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Logo section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-base font-semibold text-gray-800 mb-6">Boutique Logo</h2>

          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Boutique logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🏪</span>
              )}
            </div>

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
                {logoLoading ? 'Uploading…' : logoPath ? 'Change Logo' : 'Upload Logo'}
              </label>
              {logoError && <p className="mt-2 text-xs text-red-500">{logoError}</p>}
              <p className="mt-2 text-xs text-gray-400">PNG, JPG or WebP. Recommended: 400×400 px.</p>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={handleSave} className="space-y-6">

          {/* Boutique Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-base font-semibold text-gray-800 mb-6">Boutique Info</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="name" name="name" type="text" required
                  value={form.name} onChange={handleChange}
                  placeholder="Maison de Mariée"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="about" className={labelClass}>About</label>
                <textarea
                  id="about" name="about" rows={4}
                  value={form.about} onChange={handleChange}
                  placeholder="Tell brides about your boutique…"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="country" className={labelClass}>Country</label>
                  <select id="country" name="country" value={form.country} onChange={handleChange} className={inputClass}>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="city" className={labelClass}>City</label>
                  <select id="city" name="city" value={form.city} onChange={handleChange} className={inputClass}>
                    {(CITIES[form.country] ?? []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="address" className={labelClass}>Address</label>
                <input
                  id="address" name="address" type="text"
                  value={form.address} onChange={handleChange}
                  placeholder="123 Nguyen Hue, District 1"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Contact & Social */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-base font-semibold text-gray-800 mb-6">Contact &amp; Social</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className={labelClass}>Phone</label>
                  <input
                    id="phone" name="phone" type="tel"
                    value={form.phone} onChange={handleChange}
                    placeholder="+84 90 123 4567"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <input
                    id="email" name="email" type="email"
                    value={form.email} onChange={handleChange}
                    placeholder="hello@yourboutique.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="zalo" className={labelClass}>Zalo</label>
                <input
                  id="zalo" name="zalo" type="text"
                  value={form.zalo} onChange={handleChange}
                  placeholder="Zalo number or link"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="whatsapp" className={labelClass}>WhatsApp</label>
                <input
                  id="whatsapp" name="whatsapp" type="text"
                  value={form.whatsapp} onChange={handleChange}
                  placeholder="+84 90 123 4567 or link"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="website" className={labelClass}>Website</label>
                <input
                  id="website" name="website" type="url"
                  value={form.website} onChange={handleChange}
                  placeholder="https://yourboutique.com"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="instagram" className={labelClass}>Instagram</label>
                  <input
                    id="instagram" name="instagram" type="text"
                    value={form.instagram} onChange={handleChange}
                    placeholder="@yourboutique"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="facebook" className={labelClass}>Facebook</label>
                  <input
                    id="facebook" name="facebook" type="text"
                    value={form.facebook} onChange={handleChange}
                    placeholder="facebook.com/yourboutique"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="tiktok" className={labelClass}>TikTok</label>
                  <input
                    id="tiktok" name="tiktok" type="text"
                    value={form.tiktok} onChange={handleChange}
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
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              {saveSuccess && <p className="text-sm text-green-600">Profile saved successfully.</p>}
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
    </PortalLayout>
  );
}
