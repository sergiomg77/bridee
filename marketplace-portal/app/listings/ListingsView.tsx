'use client';

import Link from 'next/link';
import type { ListingRow } from '@/services/listing';

const SUPABASE_URL = process.env.NEXT_PUBLIC_BRIDEE_SUPABASE_URL!;

function getPhotoUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/vendor-photos/${path}`;
}

interface ListingsViewProps {
  listings: ListingRow[];
  vendorId: string;
  hasError: boolean;
}

export default function ListingsView({ listings, hasError }: ListingsViewProps) {
  if (hasError) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-sm text-red-500">Failed to load listings. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">My Listings</h2>
          <p className="mt-1 text-sm text-gray-400">
            {listings.length} listing{listings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/listings/new"
          className="px-5 py-2.5 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold hover:bg-[#b8945a] transition"
        >
          + Add Listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">No listings yet.</p>
          <Link
            href="/listings/new"
            className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold hover:bg-[#b8945a] transition"
          >
            Add your first listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <div key={listing.id} className="relative group">
              <Link
                href={`/listings/${listing.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-[#C9A96E]/30 transition"
              >
                <div className="aspect-video bg-gray-50 overflow-hidden">
                  {listing.cover_photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPhotoUrl(listing.cover_photo.path)}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">
                      📋
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <p className="text-sm font-semibold text-gray-800 truncate">{listing.title}</p>
                  {listing.category_name && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{listing.category_name}</p>
                  )}
                  {listing.city && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{listing.city}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        listing.is_active
                          ? 'bg-green-50 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {listing.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {listing.photo_count} photo{listing.photo_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
