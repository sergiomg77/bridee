import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export async function downloadFileAsBase64(
  bucket: string,
  path: string
): Promise<{ data: string | null; error: Error | null }> {
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    logger.error(`Failed to download ${bucket}/${path}`, error);
    return { data: null, error };
  }

  const arrayBuffer = await data.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return { data: base64, error: null };
}

export async function uploadBase64File(
  bucket: string,
  path: string,
  base64: string,
  contentType: string
): Promise<{ data: unknown; error: Error | null }> {
  const buffer = Buffer.from(base64, 'base64');

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType });

  if (error) {
    logger.error(`Failed to upload to ${bucket}/${path}`, error);
    return { data: null, error };
  }

  return { data, error: null };
}
