import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { downloadFileAsBase64, uploadBase64File } from '../services/storageService';
import { processTryOn } from '../services/tryonService';

// v3 tryon_queue row shape (untyped client — cast as needed)
interface TryOnJob {
  id: string;
  user_id: string;
  boutique_dress_id: string;
  reference_photo_id: string;
  dress_photo_id: string;
  status: string;
}

export async function pollTryOnQueue(): Promise<void> {
  logger.info('Polling tryon_queue for pending jobs...');

  const { data: jobs, error: fetchError } = await supabase
    .from('tryon_queue')
    .select('id, user_id, boutique_dress_id, reference_photo_id, dress_photo_id, status')
    .eq('status', 'pending')
    .limit(5);

  if (fetchError) {
    logger.error('Failed to fetch pending jobs', fetchError);
    return;
  }

  if (!jobs || jobs.length === 0) {
    logger.info('No pending jobs.');
    return;
  }

  logger.info(`Processing ${jobs.length} pending job(s)...`);

  for (const rawJob of jobs) {
    const job = rawJob as TryOnJob;

    try {
      // Mark as processing immediately to prevent double-pick
      await supabase
        .from('tryon_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', job.id);

      logger.info(`Job ${job.id}: status → processing`);

      // Resolve reference photo path
      const { data: refPhotoRow, error: refErr } = await supabase
        .from('user_reference_photos')
        .select('path')
        .eq('id', job.reference_photo_id)
        .single();

      if (refErr || !refPhotoRow) {
        throw new Error(`Reference photo not found: ${refErr?.message ?? 'no row'}`);
      }

      const referencePath = (refPhotoRow as { path: string }).path;
      logger.info(`Job ${job.id}: reference photo path = ${referencePath}`);

      // Resolve dress photo path
      const { data: dressPhotoRow, error: dressErr } = await supabase
        .from('dress_photos')
        .select('path, is_tryon_eligible')
        .eq('id', job.dress_photo_id)
        .single();

      if (dressErr || !dressPhotoRow) {
        throw new Error(`Dress photo not found: ${dressErr?.message ?? 'no row'}`);
      }

      const dressPhotoTyped = dressPhotoRow as { path: string; is_tryon_eligible: boolean };
      if (!dressPhotoTyped.is_tryon_eligible) {
        throw new Error(`Dress photo ${job.dress_photo_id} is not marked as try-on eligible`);
      }

      const dressPath = dressPhotoTyped.path;
      logger.info(`Job ${job.id}: dress photo path = ${dressPath}`);

      // Download both photos
      logger.info(`Job ${job.id}: downloading photos...`);
      const [referenceBase64, dressBase64] = await Promise.all([
        downloadFileAsBase64('tryon-photos', referencePath),
        downloadFileAsBase64('dress-photos', dressPath),
      ]);

      // Run AI try-on
      logger.info(`Job ${job.id}: running virtual try-on...`);
      const resultBase64 = await processTryOn(referenceBase64, dressBase64);

      // Upload result
      const resultPath = `results/${job.id}.jpg`;
      logger.info(`Job ${job.id}: uploading result to ${resultPath}`);
      await uploadBase64File('tryon-photos', resultPath, resultBase64, 'image/jpeg');

      // Mark completed
      await supabase
        .from('tryon_queue')
        .update({
          status: 'completed',
          result_path: resultPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      logger.info(`Job ${job.id}: completed — result at tryon-photos/${resultPath}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Job ${job.id}: failed — ${message}`);

      await supabase
        .from('tryon_queue')
        .update({
          status: 'failed',
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }
  }
}
