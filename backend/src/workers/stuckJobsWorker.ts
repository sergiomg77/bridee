import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;   // every 5 minutes
const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // jobs stuck > 10 minutes

async function resetStuckJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

  const { data: stuckJobs, error: fetchError } = await supabase
    .from('tryon_queue')
    .select('id')
    .eq('status', 'processing')
    .lt('updated_at', cutoff);

  if (fetchError) {
    logger.error('stuckJobsWorker: failed to query stuck jobs', fetchError);
    return;
  }

  if (!stuckJobs || stuckJobs.length === 0) return;

  logger.warn(`stuckJobsWorker: found ${stuckJobs.length} stuck job(s) — resetting to pending`);

  for (const row of stuckJobs) {
    const jobId = (row as { id: string }).id;

    const { error: resetError } = await supabase
      .from('tryon_queue')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('status', 'processing'); // double-check to avoid race condition

    if (resetError) {
      logger.error(`stuckJobsWorker: failed to reset job ${jobId}`, resetError);
    } else {
      logger.warn(`stuckJobsWorker: reset job ${jobId} → pending`);
    }
  }
}

export function startStuckJobsWorker(): void {
  logger.info('Stuck jobs worker started — checks every 5 minutes, threshold 10 minutes');
  setInterval(() => {
    resetStuckJobs().catch((err: unknown) => {
      logger.error('stuckJobsWorker: unhandled error', err);
    });
  }, CHECK_INTERVAL_MS);
}
