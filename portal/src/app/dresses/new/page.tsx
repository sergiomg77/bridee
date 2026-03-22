'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { createDress, createBoutiqueDress } from '@/services/dress';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

const SILHOUETTES = ['A-Line', 'Ball Gown', 'Mermaid', 'Trumpet', 'Sheath', 'Empire', 'Princess'];
const NECKLINES = ['V-Neck', 'Sweetheart', 'Off-Shoulder', 'Strapless', 'Illusion', 'Halter', 'Scoop', 'Square', 'Bateau'];
const SLEEVES = ['Sleeveless', 'Cap Sleeve', 'Short Sleeve', '3/4 Sleeve', 'Long Sleeve', 'Off-Shoulder'];
const BACK_STYLES = ['Open Back', 'V-Back', 'Lace-Up', 'Zipper', 'Button Row', 'Illusion Back'];
const LENGTHS = ['Mini', 'Knee', 'Tea', 'Ankle', 'Floor', 'Chapel', 'Cathedral'];
const TRAINS = ['None', 'Sweep', 'Court', 'Chapel', 'Cathedral', 'Royal'];
const CONDITIONS = ['New', 'Sample', 'Pre-Owned'];
const AVAILABILITIES = ['In Stock', 'Made to Order', 'Pre-Order'];
const FABRICS = ['Tulle', 'Lace', 'Satin', 'Silk', 'Chiffon', 'Organza', 'Mikado', 'Crepe', 'Velvet', 'Georgette'];
const DETAILS_OPTIONS = ['Beading', 'Sequins', 'Embroidery', 'Appliqué', 'Ruching', 'Pleating', 'Pockets', 'Belt', 'Bow'];
const OCCASIONS = ['Garden', 'Beach', 'Church', 'Courthouse', 'Ballroom', 'Destination', 'Outdoor', 'Indoor'];
const STYLE_TAGS_OPTIONS = ['Romantic', 'Boho', 'Classic', 'Modern', 'Vintage', 'Rustic', 'Glamorous', 'Minimalist', 'Ethereal'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2X', '4X'];

type ArrayField = 'fabric' | 'details' | 'occasions' | 'style_tags' | 'available_sizes';

interface DressFormState {
  title: string;
  subtitle: string;
  long_description: string;
  designer: string;
  silhouette: string;
  neckline: string;
  sleeve: string;
  back_style: string;
  length: string;
  train: string;
  color_name: string;
  color_code: string;
  condition: string;
  availability: string;
  fabric: string[];
  details: string[];
  occasions: string[];
  style_tags: string[];
  consent_confirmed: boolean;
  sku: string;
  price: string;
  price_visible: boolean;
  available_sizes: string[];
  is_active: boolean;
}

const emptyForm: DressFormState = {
  title: '',
  subtitle: '',
  long_description: '',
  designer: '',
  silhouette: '',
  neckline: '',
  sleeve: '',
  back_style: '',
  length: '',
  train: '',
  color_name: '',
  color_code: '#FFFFFF',
  condition: '',
  availability: '',
  fabric: [],
  details: [],
  occasions: [],
  style_tags: [],
  consent_confirmed: false,
  sku: '',
  price: '',
  price_visible: true,
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleArrayToggle(field: ArrayField, value: string) {
    setForm((prev) => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  }

  function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    setPhotoFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!boutiqueId) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      let coverPhotoPath: string | undefined;

      if (photoFile) {
        const path = `${boutiqueId}/${Date.now()}-${photoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('dress-photos')
          .upload(path, photoFile, { upsert: false });

        if (uploadError) {
          logger.error('NewDressPage: photo upload failed', uploadError);
          setSaveError(uploadError.message);
          setSaveLoading(false);
          return;
        }

        coverPhotoPath = path;
        logger.info('NewDressPage: photo uploaded', { path });
      }

      const { data: dress, error: dressError } = await createDress(
        supabase,
        {
          title: form.title,
          subtitle: form.subtitle || undefined,
          long_description: form.long_description || undefined,
          designer: form.designer || undefined,
          silhouette: form.silhouette || undefined,
          neckline: form.neckline || undefined,
          sleeve: form.sleeve || undefined,
          back_style: form.back_style || undefined,
          length: form.length || undefined,
          train: form.train || undefined,
          color_name: form.color_name || undefined,
          color_code: form.color_code || undefined,
          condition: form.condition || undefined,
          availability: form.availability || undefined,
          fabric: form.fabric.length ? form.fabric : undefined,
          details: form.details.length ? form.details : undefined,
          occasions: form.occasions.length ? form.occasions : undefined,
          style_tags: form.style_tags.length ? form.style_tags : undefined,
          consent_confirmed: form.consent_confirmed,
        },
        coverPhotoPath
      );

      if (dressError || !dress) {
        setSaveError(dressError ?? 'Failed to create dress.');
        setSaveLoading(false);
        return;
      }

      const { error: bdError } = await createBoutiqueDress(supabase, dress.id, boutiqueId, {
        sku: form.sku || undefined,
        price: form.price ? parseFloat(form.price) : undefined,
        price_visible: form.price_visible,
        available_sizes: form.available_sizes.length ? form.available_sizes : undefined,
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
  const selectClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition';
  const labelClass =
    'block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5';
  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
      active
        ? 'bg-[#C9A96E] border-[#C9A96E] text-white'
        : 'border-gray-200 text-gray-500 hover:border-[#C9A96E] hover:text-[#C9A96E]'
    }`;

  if (pageLoading) {
    return (
      <PortalLayout title="Add New Dress">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </PortalLayout>
    );
  }

  if (pageError) {
    return (
      <PortalLayout title="Add New Dress">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-red-500">{pageError}</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Add New Dress">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold text-gray-800 mb-8">Add New Dress</h2>

        {/* ── Cover Photo ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <h3 className="text-base font-semibold text-gray-800 mb-6">Cover Photo</h3>

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
            className="hidden"
            id="dress-photo"
          />
          <label
            htmlFor="dress-photo"
            className="inline-block px-5 py-2.5 rounded-xl border border-[#C9A96E] text-[#C9A96E] text-sm font-medium cursor-pointer hover:bg-[#C9A96E] hover:text-white transition"
          >
            {photoFile ? 'Change Photo' : 'Upload Photo'}
          </label>
          {photoError && <p className="mt-2 text-xs text-red-500">{photoError}</p>}
          <p className="mt-2 text-xs text-gray-400">PNG, JPG or WebP. Portrait orientation recommended.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* ── Basic Info ──────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-base font-semibold text-gray-800 mb-6">Basic Info</h3>
            <div className="space-y-4">

              <div>
                <label htmlFor="title" className={labelClass}>
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="title" name="title" type="text" required
                  value={form.title} onChange={handleChange}
                  placeholder="Ivory Lace A-Line"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="designer" className={labelClass}>Designer</label>
                <input
                  id="designer" name="designer" type="text"
                  value={form.designer} onChange={handleChange}
                  placeholder="Vera Wang"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="subtitle" className={labelClass}>Subtitle</label>
                <input
                  id="subtitle" name="subtitle" type="text"
                  value={form.subtitle} onChange={handleChange}
                  placeholder="Soft tulle with delicate lace appliqué"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="long_description" className={labelClass}>Description</label>
                <textarea
                  id="long_description" name="long_description" rows={4}
                  value={form.long_description} onChange={handleChange}
                  placeholder="Describe the dress in detail…"
                  className={`${inputClass} resize-none`}
                />
              </div>

            </div>
          </div>

          {/* ── Style ───────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-base font-semibold text-gray-800 mb-6">Style</h3>
            <div className="grid grid-cols-2 gap-4">

              <div>
                <label htmlFor="silhouette" className={labelClass}>Silhouette</label>
                <select id="silhouette" name="silhouette" value={form.silhouette} onChange={handleChange} className={selectClass}>
                  <option value="">— Select —</option>
                  {SILHOUETTES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="neckline" className={labelClass}>Neckline</label>
                <select id="neckline" name="neckline" value={form.neckline} onChange={handleChange} className={selectClass}>
                  <option value="">— Select —</option>
                  {NECKLINES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="sleeve" className={labelClass}>Sleeve</label>
                <select id="sleeve" name="sleeve" value={form.sleeve} onChange={handleChange} className={selectClass}>
                  <option value="">— Select —</option>
                  {SLEEVES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="back_style" className={labelClass}>Back Style</label>
                <select id="back_style" name="back_style" value={form.back_style} onChange={handleChange} className={selectClass}>
                  <option value="">— Select —</option>
                  {BACK_STYLES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="length" className={labelClass}>Length</label>
                <select id="length" name="length" value={form.length} onChange={handleChange} className={selectClass}>
                  <option value="">— Select —</option>
                  {LENGTHS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="train" className={labelClass}>Train</label>
                <select id="train" name="train" value={form.train} onChange={handleChange} className={selectClass}>
                  <option value="">— Select —</option>
                  {TRAINS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

            </div>
          </div>

          {/* ── Color ───────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-base font-semibold text-gray-800 mb-6">Color</h3>
            <div className="grid grid-cols-2 gap-4">

              <div>
                <label htmlFor="color_name" className={labelClass}>Color Name</label>
                <input
                  id="color_name" name="color_name" type="text"
                  value={form.color_name} onChange={handleChange}
                  placeholder="Ivory"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="color_code" className={labelClass}>Color</label>
                <div className="flex items-center gap-3">
                  <input
                    id="color_code" name="color_code" type="color"
                    value={form.color_code || '#FFFFFF'} onChange={handleChange}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer flex-shrink-0 p-0.5"
                  />
                  <span className="text-sm text-gray-600">{form.color_code || '#FFFFFF'}</span>
                </div>
              </div>

            </div>
          </div>

          {/* ── Details ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-base font-semibold text-gray-800 mb-6">Details</h3>
            <div className="space-y-5">

              <div>
                <p className={labelClass}>Fabric</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {FABRICS.map((v) => (
                    <button key={v} type="button" onClick={() => handleArrayToggle('fabric', v)}
                      className={chipClass(form.fabric.includes(v))}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={labelClass}>Details</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DETAILS_OPTIONS.map((v) => (
                    <button key={v} type="button" onClick={() => handleArrayToggle('details', v)}
                      className={chipClass(form.details.includes(v))}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* ── Classification ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-base font-semibold text-gray-800 mb-6">Classification</h3>
            <div className="space-y-5">

              <div>
                <p className={labelClass}>Occasions</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {OCCASIONS.map((v) => (
                    <button key={v} type="button" onClick={() => handleArrayToggle('occasions', v)}
                      className={chipClass(form.occasions.includes(v))}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={labelClass}>Style Tags</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {STYLE_TAGS_OPTIONS.map((v) => (
                    <button key={v} type="button" onClick={() => handleArrayToggle('style_tags', v)}
                      className={chipClass(form.style_tags.includes(v))}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="condition" className={labelClass}>Condition</label>
                  <select id="condition" name="condition" value={form.condition} onChange={handleChange} className={selectClass}>
                    <option value="">— Select —</option>
                    {CONDITIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="availability" className={labelClass}>Availability</label>
                  <select id="availability" name="availability" value={form.availability} onChange={handleChange} className={selectClass}>
                    <option value="">— Select —</option>
                    {AVAILABILITIES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* ── Boutique Listing ────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-base font-semibold text-gray-800 mb-6">Boutique Listing</h3>
            <div className="space-y-5">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sku" className={labelClass}>SKU</label>
                  <input
                    id="sku" name="sku" type="text"
                    value={form.sku} onChange={handleChange}
                    placeholder="BD-2024-001"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="price" className={labelClass}>Price</label>
                  <input
                    id="price" name="price" type="number" min="0" step="0.01"
                    value={form.price} onChange={handleChange}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <p className={labelClass}>Available Sizes</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SIZES.map((size) => (
                    <button key={size} type="button" onClick={() => handleArrayToggle('available_sizes', size)}
                      className={chipClass(form.available_sizes.includes(size))}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Show price to brides</p>
                  <p className="text-xs text-gray-400 mt-0.5">When off, price is hidden in the app</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, price_visible: !prev.price_visible }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.price_visible ? 'bg-[#C9A96E]' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                    form.price_visible ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Active listing</p>
                  <p className="text-xs text-gray-400 mt-0.5">Active dresses are visible to brides in the app</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.is_active ? 'bg-[#C9A96E]' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                    form.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

            </div>
          </div>

          {/* ── Consent ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="consent_confirmed"
                required
                checked={form.consent_confirmed}
                onChange={(e) => setForm((prev) => ({ ...prev, consent_confirmed: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#C9A96E] focus:ring-[#C9A96E]"
              />
              <span className="text-sm text-gray-700">
                I confirm that I have the right to list this dress and that the information provided is accurate.{' '}
                <span className="text-red-400">*</span>
              </span>
            </label>
          </div>

          {/* ── Save bar ────────────────────────────────────────────────── */}
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
    </PortalLayout>
  );
}
