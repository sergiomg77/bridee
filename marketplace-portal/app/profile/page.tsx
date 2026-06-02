'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_BRIDEE_SUPABASE_URL!;

interface VendorProfile {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  zalo: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  logo_path: string | null;
  status: string;
}

interface VendorMeEnvelope {
  data: VendorProfile;
  error: string | null;
}

interface FormValues {
  name: string;
  description: string;
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
  const supabase = createClient();

  const [vendorId, setVendorId] = useState<string | null>(null);
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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          logger.error('ProfilePage: getSession failed', sessionError);
          setPageError('Failed to load session.');
          setPageLoading(false);
          return;
        }
        if (!session) {
          setPageError('Not authenticated.');
          setPageLoading(false);
          return;
        }

        const token = session.access_token;
        const result = await apiFetch<VendorMeEnvelope>('/api/vendors/me', undefined, token);

        if (result.error || !result.data?.data) {
          logger.error('ProfilePage: failed to load vendor', { error: result.error });
          setPageError(result.error ?? 'Failed to load vendor profile.');
          setPageLoading(false);
          return;
        }

        const vendor = result.data.data;
        setVendorId(vendor.id);

        setForm({
          name: vendor.name ?? '',
          description: vendor.description ?? '',
          city: vendor.city ?? '',
          country: vendor.country ?? '',
          phone: vendor.phone ?? '',
          email: vendor.email ?? '',
          zalo: vendor.zalo ?? '',
          website: vendor.website ?? '',
          instagram: vendor.instagram ?? '',
          facebook: vendor.facebook ?? '',
          tiktok: vendor.tiktok ?? '',
        });

        if (vendor.logo_path) {
          setLogoPath(vendor.logo_path);
          setLogoPreview(`${SUPABASE_URL}/storage/v1/object/public/vendor-photos/${vendor.logo_path}`);
        }

        logger.info('ProfilePage: vendor loaded', { vendorId: vendor.id });
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
    if (!vendorId) return;

    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json() as { success?: boolean; error?: string };

      if (!res.ok || json.error) {
        setSaveError(json.error ?? 'Failed to save profile.');
      } else {
        setSaveSuccess(true);
        logger.info('ProfilePage: vendor saved', { vendorId });
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
    if (!file || !vendorId) return;

    setLogoLoading(true);
    setLogoError(null);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const path = `logos/${vendorId}/${uniqueId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor-photos')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        logger.error('ProfilePage: logo upload failed', uploadError);
        setLogoError(uploadError.message);
        setLogoLoading(false);
        return;
      }

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
      setLogoPreview(`${SUPABASE_URL}/storage/v1/object/public/vendor-photos/${path}`);
      logger.info('ProfilePage: logo uploaded', { vendorId, path });
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
      <PortalLayout title="My Profile">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </PortalLayout>
    );
  }

  if (pageError) {
    return (
      <PortalLayout title="My Profile">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-red-500">{pageError}</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="My Profile">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Logo section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-base font-semibold text-gray-800 mb-6">Business Logo</h2>

          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Business logo" className="w-full h-full object-cover" />
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

          {/* Business Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-base font-semibold text-gray-800 mb-6">Business Info</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Business Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="name" name="name" type="text" required
                  value={form.name} onChange={handleChange}
                  placeholder="Your Business Name"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="description" className={labelClass}>Description</label>
                <textarea
                  id="description" name="description" rows={4}
                  value={form.description} onChange={handleChange}
                  placeholder="Tell customers about your business…"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className={labelClass}>City</label>
                  <input
                    id="city" name="city" type="text"
                    value={form.city} onChange={handleChange}
                    placeholder="Ho Chi Minh City"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="country" className={labelClass}>Country</label>
                  <input
                    id="country" name="country" type="text"
                    value={form.country} onChange={handleChange}
                    placeholder="Vietnam"
                    className={inputClass}
                  />
                </div>
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
                    placeholder="hello@yourbusiness.com"
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
                <label htmlFor="website" className={labelClass}>Website</label>
                <input
                  id="website" name="website" type="url"
                  value={form.website} onChange={handleChange}
                  placeholder="https://yourbusiness.com"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="instagram" className={labelClass}>Instagram</label>
                  <input
                    id="instagram" name="instagram" type="text"
                    value={form.instagram} onChange={handleChange}
                    placeholder="@yourbusiness"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="facebook" className={labelClass}>Facebook</label>
                  <input
                    id="facebook" name="facebook" type="text"
                    value={form.facebook} onChange={handleChange}
                    placeholder="facebook.com/yourbusiness"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="tiktok" className={labelClass}>TikTok</label>
                  <input
                    id="tiktok" name="tiktok" type="text"
                    value={form.tiktok} onChange={handleChange}
                    placeholder="@yourbusiness"
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
