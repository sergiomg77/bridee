import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../../lib/logger';

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
