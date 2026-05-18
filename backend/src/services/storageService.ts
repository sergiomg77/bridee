import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export async function downloadFileAsBase64(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    const msg = `Failed to download ${bucket}/${path}: ${error?.message ?? 'no data returned'}`;
    logger.error(msg);
    throw new Error(msg);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

export async function uploadBase64File(
  bucket: string,
  path: string,
  base64: string,
  contentType: string
): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true });

  if (error) {
    const msg = `Failed to upload to ${bucket}/${path}: ${error.message}`;
    logger.error(msg);
    throw new Error(msg);
  }

  return path;
}
