'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { updateDress, updateBoutiqueDress } from '@/services/dress';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_BRIDEE_SUPABASE_URL!;

const SILHOUETTES = ['A-Line', 'Ball Gown', 'Mermaid', 'Trumpet', 'Sheath', 'Empire', 'Princess', 'Midi', 'Tea-length', 'Mini', 'Suit'];
const NECKLINES = ['V-Neck', 'Sweetheart', 'Off-Shoulder', 'Strapless', 'Illusion', 'Halter', 'Scoop', 'Square', 'Bateau', 'Portrait'];
const SLEEVES = ['Sleeveless', 'Cap Sleeve', 'Short Sleeve', '3/4 Sleeve', 'Long Sleeve', 'Off-Shoulder'];
const BACK_STYLES = ['Open Back', 'V-Back', 'Lace-Up', 'Zipper', 'Button Row', 'Illusion Back'];
const LENGTHS = ['Mini', 'Knee', 'Tea', 'Ankle', 'Floor', 'Chapel', 'Cathedral'];
const TRAINS = ['None', 'Sweep', 'Court', 'Chapel', 'Cathedral', 'Royal'];
const CONDITIONS = ['New', 'Sample', 'Pre-Owned'];
const AVAILABILITIES = ['In Stock', 'Made to Order', 'Pre-Order'];
const FABRICS = ['Tulle', 'Lace', 'Satin', 'Silk', 'Chiffon', 'Organza', 'Mikado', 'Crepe', 'Velvet', 'Georgette', 'Taffeta', 'Brocade'];
const DETAILS_OPTIONS = ['Beading', 'Sequins', 'Embroidery', 'Appliqué', 'Ruching', 'Pleating', 'Pockets', 'Belt', 'Bow', 'Pearls & Crystals', 'Detachable Skirt'];
const EVENT_TYPES = ['Garden', 'Beach', 'Church', 'Courthouse', 'Ballroom', 'Destination', 'Outdoor', 'Indoor', 'After Party', 'Pre-wedding Photoshoot', 'Civil Wedding', 'Engagement', 'Bachelorette Party'];
const STYLE_TAGS_OPTIONS = ['Romantic', 'Boho', 'Classic', 'Modern', 'Vintage', 'Rustic', 'Glamorous', 'Minimalist', 'Ethereal', 'Architecture', 'Gothic', 'Old Money', 'Haute Couture'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2X', '4X'];
const CURRENCIES = ['VND', 'USD', 'SGD', 'THB', 'EUR', 'GBP'];
const ADDITIONAL_SERVICES_OPTIONS = ['Online Consultation', 'Fitting Available'];

type ArrayField = 'fabric' | 'details' | 'event_types' | 'style_tags' | 'available_sizes' | 'additional_services';

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
  event_types: string[];
  style_tags: string[];
  additional_services: string[];
  consent_confirmed: boolean;
  sku: string;
  price_currency: string;
  price_sale: string;
  price_original: string;
  price_rental: string;
  price_rental_original: string;
  price_range_min: string;
  price_range_max: string;
  deal_price: string;
  deal_percent: string;
  deal_active: boolean;
  price_visible: boolean;
  available_sizes: string[];
  is_active: boolean;
}

interface LoadedIds {
  boutiqueDressId: string;
}

export default function EditDressPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id;
  const dressId = Array.isArray(rawId) ? rawId[0] : (rawId ?? '');

  const supabase = createClient();

  const [ids, setIds] = useState<LoadedIds | null>(null);
  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [dressTitle, setDressTitle] = useState<string>('');
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [form, setForm] = useState<DressFormState>({
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
    event_types: [],
    style_tags: [],
    additional_services: [],
    consent_confirmed: false,
    sku: '',
    price_currency: 'VND',
    price_sale: '',
    price_original: '',
    price_rental: '',
    price_rental_original: '',
    price_range_min: '',
    price_range_max: '',
    deal_price: '',
    deal_percent: '',
    deal_active: false,
    price_visible: true,
    available_sizes: [],
    is_active: true,
  });

  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);

  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeToggling, setActiveToggling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dressId) {
      setPageError('Invalid dress ID.');
      setPageLoading(false);
      return;
    }

    async function load() {
      try {
        console.log('EditDressPage: load started', { dressId });
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('EditDressPage: getUser', { userId: user?.id, error: userError?.message });
        if (userError) {
          logger.error('EditDressPage: getUser failed', userError);
          setPageError('Failed to load session.');
          setPageLoading(false);
          return;
        }
        if (!user) {
          setPageError('Not authenticated.');
          setPageLoading(false);
          return;
        }

        // v3: profiles has no boutique_id — query boutiques by owner_user_id
        console.log('EditDressPage: querying boutique for user', user.id);
        const { data: boutique, error: boutiqueError } = await supabase
          .from('boutiques')
          .select('id')
          .eq('owner_user_id', user.id)
          .limit(1)
          .single();

        console.log('EditDressPage: boutique result', { boutiqueId: boutique?.id, error: boutiqueError?.message });

        if (boutiqueError || !boutique) {
          logger.error('EditDressPage: boutique query failed', boutiqueError);
          setPageError('Failed to load boutique.');
          setPageLoading(false);
          return;
        }

        const bid = boutique.id;
        setBoutiqueId(bid);
        console.log('EditDressPage: loading dress data', { dressId, boutiqueId: bid });

        const [dressResult, bdResult, photoResult, countResult] = await Promise.all([
          supabase
            .from('dresses')
            .select(
              'id, title, subtitle, long_description, designer, silhouette, neckline, sleeve, back_style, length, train, color_name, color_code, condition, availability, fabric, details, event_types, style_tags, additional_services, consent_confirmed'
            )
            .eq('id', dressId)
            .single(),
          supabase
            .from('boutique_dresses')
            .select('id, sku, price_currency, price_sale, price_original, price_rental, price_rental_original, price_range_min, price_range_max, deal_price, deal_percent, deal_active, price_visible, available_sizes, is_active')
            .eq('dress_id', dressId)
            .eq('boutique_id', bid)
            .single(),
          supabase
            .from('dress_photos')
            .select('path')
            .eq('dress_id', dressId)
            .eq('sort_order', 0)
            .maybeSingle(),
          supabase
            .from('dress_photos')
            .select('*', { count: 'exact', head: true })
            .eq('dress_id', dressId),
        ]);

        if (dressResult.error || !dressResult.data) {
          logger.error('EditDressPage: dresses query failed', dressResult.error);
          setPageError('Dress not found.');
          setPageLoading(false);
          return;
        }

        if (bdResult.error || !bdResult.data) {
          logger.error('EditDressPage: boutique_dresses query failed', bdResult.error);
          setPageError('Boutique listing not found.');
          setPageLoading(false);
          return;
        }

        if (photoResult.error) {
          logger.error('EditDressPage: dress_photos query failed', photoResult.error);
        }

        if (countResult.error) {
          logger.error('EditDressPage: photo count query failed', countResult.error);
        } else {
          setPhotoCount(countResult.count ?? 0);
        }

        const dress = dressResult.data as {
          id: string;
          title: string;
          subtitle: string | null;
          long_description: string | null;
          designer: string | null;
          silhouette: string | null;
          neckline: string | null;
          sleeve: string | null;
          back_style: string | null;
          length: string | null;
          train: string | null;
          color_name: string | null;
          color_code: string | null;
          condition: string | null;
          availability: string | null;
          fabric: string[] | null;
          details: string[] | null;
          event_types: string[] | null;
          style_tags: string[] | null;
          additional_services: string[] | null;
          consent_confirmed: boolean;
        };

        const bd = bdResult.data as {
          id: string;
          sku: string | null;
          price_currency: string;
          price_sale: number | null;
          price_original: number | null;
          price_rental: number | null;
          price_rental_original: number | null;
          price_range_min: number | null;
          price_range_max: number | null;
          deal_price: number | null;
          deal_percent: number | null;
          deal_active: boolean;
          price_visible: boolean;
          available_sizes: string[] | null;
          is_active: boolean;
        };

        setIds({ boutiqueDressId: bd.id });
        setDressTitle(dress.title);

        setForm({
          title: dress.title,
          subtitle: dress.subtitle ?? '',
          long_description: dress.long_description ?? '',
          designer: dress.designer ?? '',
          silhouette: dress.silhouette ?? '',
          neckline: dress.neckline ?? '',
          sleeve: dress.sleeve ?? '',
          back_style: dress.back_style ?? '',
          length: dress.length ?? '',
          train: dress.train ?? '',
          color_name: dress.color_name ?? '',
          color_code: dress.color_code ?? '#FFFFFF',
          condition: dress.condition ?? '',
          availability: dress.availability ?? '',
          fabric: dress.fabric ?? [],
          details: dress.details ?? [],
          event_types: dress.event_types ?? [],
          style_tags: dress.style_tags ?? [],
          additional_services: dress.additional_services ?? [],
          consent_confirmed: dress.consent_confirmed,
          sku: bd.sku ?? '',
          price_currency: bd.price_currency ?? 'VND',
          price_sale: bd.price_sale !== null ? String(bd.price_sale) : '',
          price_original: bd.price_original !== null ? String(bd.price_original) : '',
          price_rental: bd.price_rental !== null ? String(bd.price_rental) : '',
          price_rental_original: bd.price_rental_original !== null ? String(bd.price_rental_original) : '',
          price_range_min: bd.price_range_min !== null ? String(bd.price_range_min) : '',
          price_range_max: bd.price_range_max !== null ? String(bd.price_range_max) : '',
          deal_price: bd.deal_price !== null ? String(bd.deal_price) : '',
          deal_percent: bd.deal_percent !== null ? String(bd.deal_percent) : '',
          deal_active: bd.deal_active ?? false,
          price_visible: bd.price_visible,
          available_sizes: bd.available_sizes ?? [],
          is_active: bd.is_active,
        });

        const photoPath = (photoResult.data as { path: string } | null)?.path ?? null;
        if (photoPath) {
          setImagePath(photoPath);
          setImagePreview(`${SUPABASE_URL}/storage/v1/object/public/dress-photos/${photoPath}`);
        }

        logger.info('EditDressPage: dress loaded', { dressId, boutiqueDressId: bd.id });
      } catch (err) {
        logger.error('EditDressPage: unexpected error during load', err);
        setPageError('An unexpected error occurred.');
      } finally {
        setPageLoading(false);
      }
    }

    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dressId]);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleArrayToggle(field: ArrayField, value: string) {
    setForm((prev) => {
      const current = prev[field] as string[];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  }

  async function handleActiveToggle() {
    if (!ids) return;
    setActiveToggling(true);

    const newActive = !form.is_active;
    const { error } = await updateBoutiqueDress(supabase, ids.boutiqueDressId, {
      is_active: newActive,
    });

    if (error) {
      logger.error('EditDressPage: toggle active failed', { error });
    } else {
      setForm((prev) => ({ ...prev, is_active: newActive }));
      logger.info('EditDressPage: is_active toggled', { boutiqueDressId: ids.boutiqueDressId, newActive });
    }

    setActiveToggling(false);
  }

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !boutiqueId) return;

    setPhotoLoading(true);
    setPhotoError(null);

    try {
      const path = `${boutiqueId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from('dress-photos')
        .upload(path, file, { upsert: false });

      if (uploadError) {
        logger.error('EditDressPage: photo upload failed', uploadError);
        setPhotoError(uploadError.message);
        setPhotoLoading(false);
        return;
      }

      setImagePath(path);
      setImagePreview(`${SUPABASE_URL}/storage/v1/object/public/dress-photos/${path}`);
      setPhotoChanged(true);
      logger.info('EditDressPage: photo uploaded', { path });
    } catch (err) {
      logger.error('EditDressPage: unexpected error during photo upload', err);
      setPhotoError('An unexpected error occurred during upload.');
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ids) return;

    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const newCoverPhotoPath = photoChanged && imagePath ? imagePath : undefined;

      const { error: dressError } = await updateDress(
        supabase,
        dressId,
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
          event_types: form.event_types.length ? form.event_types : undefined,
          style_tags: form.style_tags.length ? form.style_tags : undefined,
          additional_services: form.additional_services.length ? form.additional_services : undefined,
          consent_confirmed: form.consent_confirmed,
        },
        newCoverPhotoPath
      );

      if (dressError) {
        setSaveError(dressError);
        setSaveLoading(false);
        return;
      }

      const { error: bdError } = await updateBoutiqueDress(supabase, ids.boutiqueDressId, {
        sku: form.sku || undefined,
        price_currency: form.price_currency,
        price_sale: form.price_sale ? parseFloat(form.price_sale) : null,
        price_original: form.price_original ? parseFloat(form.price_original) : null,
        price_rental: form.price_rental ? parseFloat(form.price_rental) : null,
        price_rental_original: form.price_rental_original ? parseFloat(form.price_rental_original) : null,
        price_range_min: form.price_range_min ? parseFloat(form.price_range_min) : null,
        price_range_max: form.price_range_max ? parseFloat(form.price_range_max) : null,
        deal_price: form.deal_price ? parseFloat(form.deal_price) : null,
        deal_percent: form.deal_percent ? parseFloat(form.deal_percent) : null,
        deal_active: form.deal_active,
        price_visible: form.price_visible,
        available_sizes: form.available_sizes.length ? form.available_sizes : undefined,
        is_active: form.is_active,
      });

      if (bdError) {
        setSaveError(bdError);
        setSaveLoading(false);
        return;
      }

      setDressTitle(form.title);
      setPhotoChanged(false);
      setSaveSuccess(true);
      logger.info('EditDressPage: dress updated', { dressId, boutiqueDressId: ids.boutiqueDressId });
    } catch (err) {
      logger.error('EditDressPage: unexpected error during save', err);
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
  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
      active
        ? 'bg-[#C9A96E] border-[#C9A96E] text-white'
        : 'border-gray-200 text-gray-500 hover:border-[#C9A96E] hover:text-[#C9A96E]'
    }`;

  if (pageLoading) {
    return (
      <PortalLayout title="Edit Dress">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </PortalLayout>
    );
  }

  if (pageError) {
    return (
      <PortalLayout title="Edit Dress">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-red-500">{pageError}</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title={dressTitle || 'Edit Dress'}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 truncate">{dressTitle}</h2>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <Link
              href={`/dresses/${dressId}/photos`}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#C9A96E] hover:text-[#C9A96E] transition"
            >
              Add more photos
            </Link>
            <span className="text-xs text-gray-500 font-medium">
              {form.is_active ? 'Active' : 'Inactive'}
            </span>
            <button
              type="button"
              onClick={handleActiveToggle}
              disabled={activeToggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                form.is_active ? 'bg-[#C9A96E]' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                form.is_active ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

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
                <p className={labelClass}>Event Types</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {EVENT_TYPES.map((v) => (
                    <button key={v} type="button" onClick={() => handleArrayToggle('event_types', v)}
                      className={chipClass(form.event_types.includes(v))}>
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

              <div>
                <label htmlFor="sku" className={labelClass}>SKU</label>
                <input
                  id="sku" name="sku" type="text"
                  value={form.sku} onChange={handleChange}
                  placeholder="BD-2024-001"
                  className={inputClass}
                />
              </div>

              {/* ── Pricing ── */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pricing</p>

                <div>
                  <label htmlFor="price_currency" className={labelClass}>Currency</label>
                  <select
                    id="price_currency" name="price_currency"
                    value={form.price_currency} onChange={handleChange}
                    className={selectClass}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price_sale" className={labelClass}>Sale Price</label>
                    <input
                      id="price_sale" name="price_sale" type="number" min="0" step="1"
                      value={form.price_sale} onChange={handleChange}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="price_original" className={labelClass}>Original Price</label>
                    <input
                      id="price_original" name="price_original" type="number" min="0" step="1"
                      value={form.price_original} onChange={handleChange}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price_rental" className={labelClass}>Rental Price</label>
                    <input
                      id="price_rental" name="price_rental" type="number" min="0" step="1"
                      value={form.price_rental} onChange={handleChange}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="price_rental_original" className={labelClass}>Original Rental Price</label>
                    <input
                      id="price_rental_original" name="price_rental_original" type="number" min="0" step="1"
                      value={form.price_rental_original} onChange={handleChange}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price_range_min" className={labelClass}>Price Range Min</label>
                    <input
                      id="price_range_min" name="price_range_min" type="number" min="0" step="1"
                      value={form.price_range_min} onChange={handleChange}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="price_range_max" className={labelClass}>Price Range Max</label>
                    <input
                      id="price_range_max" name="price_range_max" type="number" min="0" step="1"
                      value={form.price_range_max} onChange={handleChange}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="hidden pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Deal</p>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label htmlFor="deal_price" className={labelClass}>Deal Price</label>
                      <input
                        id="deal_price" name="deal_price" type="number" min="0" step="1"
                        value={form.deal_price} onChange={handleChange}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="deal_percent" className={labelClass}>Deal %</label>
                      <input
                        id="deal_percent" name="deal_percent" type="number" min="0" max="100" step="1"
                        value={form.deal_percent} onChange={handleChange}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Deal active</p>
                      <p className="text-xs text-gray-400 mt-0.5">Shows deal price to brides</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, deal_active: !prev.deal_active }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        form.deal_active ? 'bg-[#C9A96E]' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                        form.deal_active ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Stock & Status ── */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock &amp; Status</p>

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

                <div>
                  <p className={labelClass}>Additional Services</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ADDITIONAL_SERVICES_OPTIONS.map((v) => (
                      <button key={v} type="button" onClick={() => handleArrayToggle('additional_services', v)}
                        className={chipClass(form.additional_services.includes(v))}>
                        {v}
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
                    <p className="text-xs text-gray-400 mt-0.5">Toggle updates immediately without saving</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleActiveToggle}
                    disabled={activeToggling}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
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
          </div>

          {/* ── Consent ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="consent_confirmed"
                checked={form.consent_confirmed}
                onChange={(e) => setForm((prev) => ({ ...prev, consent_confirmed: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#C9A96E] focus:ring-[#C9A96E]"
              />
              <span className="text-sm text-gray-700">
                I confirm that I have the right to list this dress and that the information provided is accurate.
              </span>
            </label>
          </div>

          {/* ── Save bar ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              {saveSuccess && <p className="text-sm text-green-600">Changes saved.</p>}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/dresses')}
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
