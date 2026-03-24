import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { downloadFileAsBase64, uploadBase64File } from '../services/storageService';
import { processTryOn } from '../services/tryonService';

export async function pollTryOnQueue(): Promise<void> {
  logger.info('Polling tryon_queue for pending jobs...');

  const { data: jobs, error: fetchError } = await supabase
    .from('tryon_queue')
    .select('*')
    .eq('status', 'pending')
    .limit(5);

  if (fetchError) {
    logger.error('Failed to fetch pending jobs from tryon_queue', fetchError);
    return;
  }

  if (!jobs || jobs.length === 0) {
    logger.info('No pending jobs found.');
    return;
  }

  logger.info(`Found ${jobs.length} pending job(s). Processing...`);

  for (const job of jobs) {
    const jobId: string = job.id as string;

    try {
      await supabase
        .from('tryon_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', jobId);

      const { data: userPhotoBase64, error: userPhotoError } = await downloadFileAsBase64(
        'tryon-photos',
        job.user_photo_path as string
      );

      if (userPhotoError || !userPhotoBase64) {
        throw new Error(`Failed to download user photo: ${userPhotoError?.message ?? 'unknown'}`);
      }

      const { data: dressPhotoBase64, error: dressPhotoError } = await downloadFileAsBase64(
        'dress-photos',
        job.dress_photo_path as string
      );

      if (dressPhotoError || !dressPhotoBase64) {
        throw new Error(`Failed to download dress photo: ${dressPhotoError?.message ?? 'unknown'}`);
      }

      const { data: resultBase64, error: tryonError } = await processTryOn(
        dressPhotoBase64,
        userPhotoBase64
      );

      if (tryonError || !resultBase64) {
        throw new Error(`Try-on processing failed: ${tryonError?.message ?? 'unknown'}`);
      }

      const resultPath = `results/${jobId}-result.jpg`;

      const { error: uploadError } = await uploadBase64File(
        'tryon-photos',
        resultPath,
        resultBase64,
        'image/jpeg'
      );

      if (uploadError) {
        throw new Error(`Failed to upload result: ${uploadError.message}`);
      }

      await supabase
        .from('tryon_queue')
        .update({
          status: 'completed',
          result_path: resultPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      logger.info(`Job ${jobId} completed. Result at: ${resultPath}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`Job ${jobId} failed: ${error.message}`, error);

      await supabase
        .from('tryon_queue')
        .update({
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }
  }
}
