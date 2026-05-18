import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';

export async function uploadAvatar(
  userId: string,
  base64: string
): Promise<{ path: string | null; error: string | null }> {
  try {
    const path = `${userId}/avatar.jpg`;
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    const blob = await response.blob();

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      logger.error('storageService: uploadAvatar failed', { error: error.message });
      return { path: null, error: error.message };
    }

    return { path, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    logger.error('storageService: uploadAvatar unexpected error', { error: msg });
    return { path: null, error: msg };
  }
}
