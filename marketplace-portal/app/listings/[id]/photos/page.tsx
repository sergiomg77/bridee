'use client';

import { useState, useEffect, useRef, type DragEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import {
  fetchListingPhotos,
  updatePhotoOrder,
  deleteListingPhoto,
  type ListingPhoto,
} from '@/services/listing';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_BRIDEE_SUPABASE_URL!;
const MAX_PHOTOS = 10;

function getPhotoUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/vendor-photos/${path}`;
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

// ─── Sortable Photo Card ──────────────────────────────────────────────────────

interface SortablePhotoCardProps {
  photo: ListingPhoto;
  confirmDeleteId: string | null;
  actionLoadingId: string | null;
  onSetCover: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}

function SortablePhotoCard({
  photo,
  confirmDeleteId,
  actionLoadingId,
  onSetCover,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: SortablePhotoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isLoading = actionLoadingId === photo.id;
  const isConfirming = confirmDeleteId === photo.id;
  const isCover = photo.is_cover || photo.sort_order === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`relative bg-white rounded-2xl border overflow-hidden transition-shadow ${
        isDragging
          ? 'opacity-50 shadow-xl border-[#C9A96E]/40 z-10'
          : 'border-gray-100 shadow-sm'
      }`}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        title="Drag to reorder"
        className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing p-1 rounded-lg bg-white/90 text-gray-300 hover:text-gray-500 transition"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2Zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8Zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14Zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6Zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8Zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14Z" />
        </svg>
      </div>

      {/* Cover badge */}
      {isCover && (
        <div className="absolute top-2 right-2 z-10">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C9A96E] text-white shadow-sm">
            Cover
          </span>
        </div>
      )}

      {/* Photo */}
      <div className="aspect-video bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getPhotoUrl(photo.path)}
          alt={`Photo ${photo.sort_order + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Actions */}
      <div className="p-3 space-y-1.5">
        {isConfirming ? (
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-2">Delete this photo?</p>
            <div className="flex gap-2">
              <button
                onClick={() => onDeleteConfirm(photo.id)}
                disabled={isLoading}
                className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition"
              >
                {isLoading ? '…' : 'Delete'}
              </button>
              <button
                onClick={onDeleteCancel}
                disabled={isLoading}
                className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {!isCover && (
              <button
                onClick={() => onSetCover(photo.id)}
                disabled={isLoading}
                className="w-full py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:border-[#C9A96E] hover:text-[#C9A96E] disabled:opacity-50 transition"
              >
                Set as Cover
              </button>
            )}
            <button
              onClick={() => onDeleteRequest(photo.id)}
              disabled={isLoading}
              className="w-full py-1.5 rounded-lg border border-red-100 text-red-400 text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Photos Page ──────────────────────────────────────────────────────────────

interface VendorEnvelope {
  data: { id: string };
  error: string | null;
}

export default function ListingPhotosPage() {
  const params = useParams();
  const rawId = params.id;
  const listingId = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');

  const supabase = createClient();

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [listingTitle, setListingTitle] = useState<string>('');
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

        const [titleResult, photosResult] = await Promise.all([
          supabase.from('vendor_listings').select('title').eq('id', listingId).single(),
          fetchListingPhotos(supabase, listingId),
        ]);

        if (titleResult.data) {
          setListingTitle((titleResult.data as { title: string }).title);
        }

        if (photosResult.error) {
          setPageError(photosResult.error);
          setPageLoading(false);
          return;
        }

        setPhotos(photosResult.data ?? []);
      } catch (err) {
        logger.error('ListingPhotosPage: unexpected error during load', err);
        setPageError('An unexpected error occurred.');
      } finally {
        setPageLoading(false);
      }
    }

    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  async function uploadFiles(files: File[]) {
    if (!vendorId) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, remaining);

    setUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        const sortOrder = photos.length + i;
        const isCover = sortOrder === 0;

        let base64: string;
        try {
          base64 = await fileToBase64(file);
        } catch {
          setUploadError('Failed to read file.');
          setUploading(false);
          return;
        }

        const result = await apiFetch(
          `/api/vendors/${vendorId}/listings/${listingId}/photos`,
          {
            method: 'POST',
            body: JSON.stringify({ image_base64: base64, sort_order: sortOrder, is_cover: isCover }),
          },
          token
        );

        if (result.error) {
          logger.error('ListingPhotosPage: photo upload failed', { error: result.error });
          setUploadError(result.error);
          setUploading(false);
          return;
        }
      }

      const { data, error } = await fetchListingPhotos(supabase, listingId);
      if (error) {
        setUploadError('Upload succeeded but failed to refresh. Please reload.');
      } else {
        setPhotos(data ?? []);
        logger.info('ListingPhotosPage: photos uploaded', { count: toUpload.length });
      }
    } catch (err) {
      logger.error('ListingPhotosPage: unexpected error during upload', err);
      setUploadError('An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) void uploadFiles(files);
  }

  function handleZoneDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingFile(true);
  }

  function handleZoneDragLeave() {
    setIsDraggingFile(false);
  }

  function handleZoneDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingFile(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) void uploadFiles(files);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(photos, oldIndex, newIndex).map((p, i) => ({
      ...p,
      sort_order: i,
      is_cover: i === 0,
    }));

    setPhotos(reordered);

    void updatePhotoOrder(supabase, reordered.map((p) => ({ id: p.id, sort_order: p.sort_order }))).then(
      async ({ error }) => {
        if (error) {
          logger.error('ListingPhotosPage: updatePhotoOrder failed after drag', { error });
          setActionError('Failed to save new order. Please try again.');
          return;
        }
        // Update is_cover for the new first photo
        const newCover = reordered[0];
        if (newCover) {
          await supabase.from('vendor_listing_photos').update({ is_cover: false }).eq('listing_id', listingId);
          await supabase.from('vendor_listing_photos').update({ is_cover: true }).eq('id', newCover.id);
        }
      }
    );
  }

  async function handleSetCover(photoId: string) {
    setActionLoadingId(photoId);
    setActionError(null);

    const selected = photos.find((p) => p.id === photoId);
    if (!selected) {
      setActionLoadingId(null);
      return;
    }

    const reordered = [
      selected,
      ...photos.filter((p) => p.id !== photoId),
    ].map((p, i) => ({ ...p, sort_order: i, is_cover: i === 0 }));

    const { error } = await updatePhotoOrder(
      supabase,
      reordered.map((p) => ({ id: p.id, sort_order: p.sort_order }))
    );

    if (error) {
      logger.error('ListingPhotosPage: setAsCover failed', { error });
      setActionError('Failed to set cover photo.');
    } else {
      await supabase.from('vendor_listing_photos').update({ is_cover: false }).eq('listing_id', listingId);
      await supabase.from('vendor_listing_photos').update({ is_cover: true }).eq('id', photoId);
      setPhotos(reordered);
      logger.info('ListingPhotosPage: cover set', { photoId });
    }

    setActionLoadingId(null);
  }

  async function handleDeleteConfirm(photoId: string) {
    setActionLoadingId(photoId);
    setActionError(null);

    try {
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) {
        setActionLoadingId(null);
        setConfirmDeleteId(null);
        return;
      }

      const { error: storageError } = await supabase.storage
        .from('vendor-photos')
        .remove([photo.path]);
      if (storageError) {
        logger.error('ListingPhotosPage: storage delete failed (non-fatal)', storageError);
      }

      const { error: dbError } = await deleteListingPhoto(supabase, photoId);
      if (dbError) {
        logger.error('ListingPhotosPage: db delete failed', { error: dbError });
        setActionError('Failed to delete photo.');
        return;
      }

      const remaining = photos
        .filter((p) => p.id !== photoId)
        .map((p, i) => ({ ...p, sort_order: i, is_cover: i === 0 }));

      if (remaining.length > 0) {
        const { error: orderError } = await updatePhotoOrder(
          supabase,
          remaining.map((p) => ({ id: p.id, sort_order: p.sort_order }))
        );
        if (orderError) {
          logger.error('ListingPhotosPage: re-order after delete failed', { error: orderError });
        }
      }

      setPhotos(remaining);
      logger.info('ListingPhotosPage: photo deleted', { photoId });
    } catch (err) {
      logger.error('ListingPhotosPage: unexpected error during delete', err);
      setActionError('An unexpected error occurred.');
    } finally {
      setActionLoadingId(null);
      setConfirmDeleteId(null);
    }
  }

  const atLimit = photos.length >= MAX_PHOTOS;

  if (pageLoading) {
    return (
      <PortalLayout title="Manage Photos">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </PortalLayout>
    );
  }

  if (pageError) {
    return (
      <PortalLayout title="Manage Photos">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-red-500">{pageError}</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Manage Photos">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{listingTitle}</h2>
            <p className="mt-0.5 text-sm text-gray-400">
              {photos.length} / {MAX_PHOTOS} photos
            </p>
          </div>
          <Link
            href={`/listings/${listingId}`}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition flex-shrink-0"
          >
            ← Back to Listing
          </Link>
        </div>

        {actionError && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
            <p className="text-sm text-red-500">{actionError}</p>
          </div>
        )}

        {/* Upload zone */}
        <div
          onDragOver={atLimit || uploading ? undefined : handleZoneDragOver}
          onDragLeave={handleZoneDragLeave}
          onDrop={atLimit || uploading ? undefined : handleZoneDrop}
          onClick={() => !atLimit && !uploading && fileInputRef.current?.click()}
          className={`mb-8 rounded-2xl border-2 border-dashed p-10 text-center transition ${
            atLimit || uploading
              ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
              : isDraggingFile
              ? 'border-[#C9A96E] bg-[#C9A96E]/5 cursor-pointer'
              : 'border-gray-200 bg-white hover:border-[#C9A96E]/50 hover:bg-[#C9A96E]/5 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          {uploading ? (
            <p className="text-sm text-gray-400">Uploading…</p>
          ) : atLimit ? (
            <p className="text-sm text-gray-400">Maximum {MAX_PHOTOS} photos reached</p>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/10 flex items-center justify-center mx-auto mb-3">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#C9A96E]">
                  <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">
                {isDraggingFile ? 'Drop photos here' : 'Drag photos here or click to upload'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                JPG, PNG or WebP · {MAX_PHOTOS - photos.length} slot{MAX_PHOTOS - photos.length !== 1 ? 's' : ''} remaining
              </p>
            </>
          )}
        </div>

        {uploadError && <p className="mb-6 text-sm text-red-500">{uploadError}</p>}

        {/* Photo grid */}
        {photos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-sm text-gray-400">No photos yet. Upload your first photo above.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <SortablePhotoCard
                    key={photo.id}
                    photo={photo}
                    confirmDeleteId={confirmDeleteId}
                    actionLoadingId={actionLoadingId}
                    onSetCover={handleSetCover}
                    onDeleteRequest={(id) => {
                      setConfirmDeleteId(id);
                      setActionError(null);
                    }}
                    onDeleteConfirm={handleDeleteConfirm}
                    onDeleteCancel={() => setConfirmDeleteId(null)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </PortalLayout>
  );
}
