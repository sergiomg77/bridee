import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../../lib/logger';
import { apiFetch } from '../api';
import { API } from '../../constants/api';
import type { ReferencePhoto, ReferencePhotoType, TryOnJob } from '../../types/tryon';

// ── Legacy Supabase-direct function ───────────────────────────────────────────

interface AddToTryOnQueueParams {
  userId: string;
  dressId: string;
  dressPhotoPath: string;
  userPhotoPath: string;
}

export async function addToTryOnQueue(
  supabase: SupabaseClient,
  params: AddToTryOnQueueParams
): Promise<{ data: null; error: string | null }> {
  const { userId, dressId, dressPhotoPath, userPhotoPath } = params;

  const { error } = await supabase.from('tryon_queue').insert({
    user_id: userId,
    dress_id: dressId,
    dress_photo_path: dressPhotoPath,
    user_photo_path: userPhotoPath,
    status: 'pending',
  });

  if (error) {
    logger.error('addToTryOnQueue: insert failed', error);
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

// ── v3 API functions ──────────────────────────────────────────────────────────

export async function getReferencePhotos(): Promise<{ data: ReferencePhoto[] | null; error: string | null }> {
  return apiFetch<ReferencePhoto[]>(API.tryon.referencePhotos(), { method: 'GET' });
}

export async function uploadReferencePhoto(
  photoType: ReferencePhotoType,
  imageBase64: string
): Promise<{ data: ReferencePhoto | null; error: string | null }> {
  return apiFetch<ReferencePhoto>(API.tryon.referencePhotos(), {
    method: 'POST',
    body: JSON.stringify({ photo_type: photoType, image_base64: imageBase64 }),
  });
}

export async function createTryOnJob(
  boutiqueDressId: string,
  dressPhotoId: string
): Promise<{ data: TryOnJob | null; error: string | null }> {
  return apiFetch<TryOnJob>(API.tryon.jobs(), {
    method: 'POST',
    body: JSON.stringify({ boutique_dress_id: boutiqueDressId, dress_photo_id: dressPhotoId }),
  });
}

export async function getTryOnJobs(): Promise<{ data: TryOnJob[] | null; error: string | null }> {
  return apiFetch<TryOnJob[]>(API.tryon.jobs(), { method: 'GET' });
}

export async function getTryOnJob(
  id: string
): Promise<{ data: TryOnJob | null; error: string | null }> {
  return apiFetch<TryOnJob>(API.tryon.job(id), { method: 'GET' });
}

export async function deleteTryOnJob(
  id: string
): Promise<{ data: null; error: string | null }> {
  return apiFetch<null>(API.tryon.job(id), { method: 'DELETE' });
}
