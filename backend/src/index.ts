import 'dotenv/config';
import { logger } from './lib/logger';
import { pollTryOnQueue } from './workers/tryonWorker';

logger.info(`Bridee backend worker starting at ${new Date().toISOString()}`);
logger.info(`SUPABASE_URL: ${process.env.SUPABASE_URL}`);
logger.info(`GCP_PROJECT_ID: ${process.env.GCP_PROJECT_ID}`);

const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS ?? '10000', 10);

pollTryOnQueue();

setInterval(() => {
  logger.info('Poll cycle starting...');
  pollTryOnQueue();
}, pollIntervalMs);
