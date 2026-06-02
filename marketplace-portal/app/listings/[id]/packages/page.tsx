'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';
import type { VendorPackage } from '@/services/listing';

interface VendorEnvelope {
  data: { id: string };
  error: string | null;
}

interface PackageEnvelope {
  data: VendorPackage;
  error: string | null;
}

const PRICING_MODEL_LABELS: Record<string, string> = {
  fixed: 'Fixed Price',
  per_hour: 'Per Hour',
  quote: 'Quote Only',
};

function formatPackagePrice(pkg: VendorPackage): string {
  if (pkg.pricing_model === 'quote') return 'Quote Only';
  if (pkg.price === null) return '—';
  const symbol = pkg.price_currency === 'VND' ? '₫' : pkg.price_currency;
  return `${symbol}${pkg.price.toLocaleString()}`;
}

export default function PackagesPage() {
  const params = useParams();
  const rawId = params.id;
  const listingId = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');

  const supabase = createClient();

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [listingTitle, setListingTitle] = useState('');
  const [packages, setPackages] = useState<VendorPackage[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add package form state
  const [formName, setFormName] = useState('');
  const [formPricingModel, setFormPricingModel] = useState<'fixed' | 'per_hour' | 'quote'>('fixed');
  const [formPrice, setFormPrice] = useState('');
  const [formCurrency, setFormCurrency] = useState('VND');
  const [formDescription, setFormDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

        const vendorResult = await apiFetch<VendorEnvelope>('/api/vendors/me', undefined, t);
        if (vendorResult.error || !vendorResult.data?.data?.id) {
          setPageError(vendorResult.error ?? 'Failed to load vendor profile.');
          setPageLoading(false);
          return;
        }

        setVendorId(vendorResult.data.data.id);

        const [titleResult, pkgResult] = await Promise.all([
          supabase.from('vendor_listings').select('title').eq('id', listingId).single(),
          supabase
            .from('vendor_packages')
            .select('id, listing_id, name, description, pricing_model, price, price_currency, sort_order, is_active')
            .eq('listing_id', listingId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
        ]);

        if (titleResult.data) {
          setListingTitle((titleResult.data as { title: string }).title);
        }

        if (pkgResult.error) {
          logger.error('PackagesPage: packages query failed', pkgResult.error);
        } else {
          setPackages((pkgResult.data ?? []) as VendorPackage[]);
        }
      } catch (err) {
        logger.error('PackagesPage: unexpected error during load', err);
        setPageError('An unexpected error occurred.');
      } finally {
        setPageLoading(false);
      }
    }

    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  async function handleDelete(pkg: VendorPackage) {
    if (!vendorId) return;
    setDeletingId(pkg.id);

    const result = await apiFetch(
      `/api/vendors/${vendorId}/listings/${listingId}/packages/${pkg.id}`,
      { method: 'DELETE' },
      token
    );

    if (result.error) {
      logger.error('PackagesPage: delete failed', { error: result.error });
    } else {
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      logger.info('PackagesPage: package deleted', { packageId: pkg.id });
    }

    setDeletingId(null);
  }

  async function handleAddPackage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vendorId) return;

    setFormLoading(true);
    setFormError(null);

    try {
      const result = await apiFetch<PackageEnvelope>(
        `/api/vendors/${vendorId}/listings/${listingId}/packages`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: formName,
            pricing_model: formPricingModel,
            price: formPricingModel !== 'quote' && formPrice ? parseFloat(formPrice) : null,
            price_currency: formCurrency,
            description: formDescription || undefined,
            sort_order: packages.length,
          }),
        },
        token
      );

      if (result.error || !result.data?.data) {
        setFormError(result.error ?? 'Failed to add package.');
        return;
      }

      setPackages((prev) => [...prev, result.data!.data]);
      setFormName('');
      setFormPricingModel('fixed');
      setFormPrice('');
      setFormCurrency('VND');
      setFormDescription('');
      logger.info('PackagesPage: package added', { packageId: result.data.data.id });
    } catch (err) {
      logger.error('PackagesPage: unexpected error adding package', err);
      setFormError('An unexpected error occurred.');
    } finally {
      setFormLoading(false);
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
      <PortalLayout title="Manage Packages">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </PortalLayout>
    );
  }

  if (pageError) {
    return (
      <PortalLayout title="Manage Packages">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-red-500">{pageError}</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Manage Packages">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{listingTitle}</h2>
            <p className="mt-0.5 text-sm text-gray-400">
              {packages.length} package{packages.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href={`/listings/${listingId}`}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition flex-shrink-0"
          >
            ← Back to Listing
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Package list */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Packages
            </h3>

            {packages.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <p className="text-sm text-gray-400">No packages yet. Add one using the form.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{pkg.name}</p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C9A96E]/10 text-[#C9A96E]">
                            {PRICING_MODEL_LABELS[pkg.pricing_model] ?? pkg.pricing_model}
                          </span>
                        </div>
                        {pkg.pricing_model !== 'quote' && pkg.price !== null && (
                          <p className="mt-1 text-sm font-medium text-[#C9A96E]">
                            {formatPackagePrice(pkg)}
                          </p>
                        )}
                        {pkg.pricing_model === 'quote' && (
                          <p className="mt-1 text-xs text-gray-400">Price on request</p>
                        )}
                        {pkg.description && (
                          <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{pkg.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(pkg)}
                        disabled={deletingId === pkg.id}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-red-100 text-red-400 text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition"
                      >
                        {deletingId === pkg.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add package form */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Add Package
            </h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <form onSubmit={handleAddPackage} className="space-y-4">

                <div>
                  <label htmlFor="pkg-name" className={labelClass}>
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="pkg-name" type="text" required
                    value={formName} onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Standard Package"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="pkg-model" className={labelClass}>
                    Pricing Model <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="pkg-model"
                    value={formPricingModel}
                    onChange={(e) => setFormPricingModel(e.target.value as 'fixed' | 'per_hour' | 'quote')}
                    className={selectClass}
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="per_hour">Per Hour</option>
                    <option value="quote">Quote Only</option>
                  </select>
                </div>

                {formPricingModel !== 'quote' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="pkg-price" className={labelClass}>Price</label>
                      <input
                        id="pkg-price" type="number" min="0" step="1"
                        value={formPrice} onChange={(e) => setFormPrice(e.target.value)}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="pkg-currency" className={labelClass}>Currency</label>
                      <input
                        id="pkg-currency" type="text"
                        value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)}
                        placeholder="VND"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="pkg-description" className={labelClass}>Description</label>
                  <textarea
                    id="pkg-description" rows={3}
                    value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="What's included…"
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {formError && <p className="text-sm text-red-500">{formError}</p>}

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold hover:bg-[#b8945a] disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {formLoading ? 'Adding…' : 'Add Package'}
                </button>

              </form>
            </div>
          </div>

        </div>
      </div>
    </PortalLayout>
  );
}
