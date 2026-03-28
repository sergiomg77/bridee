import 'dotenv/config';
import { logger } from './lib/logger';
import { pollTryOnQueue } from './workers/tryonWorker';

// Bridge BRIDEE_GOOGLE_CREDENTIALS_PATH → GOOGLE_APPLICATION_CREDENTIALS for the Google SDK
if (process.env.BRIDEE_GOOGLE_CREDENTIALS_PATH) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.BRIDEE_GOOGLE_CREDENTIALS_PATH;
}

logger.info(`Bridee backend worker starting at ${new Date().toISOString()}`);
logger.info(`BRIDEE_SUPABASE_URL: ${process.env.BRIDEE_SUPABASE_URL}`);
logger.info(`BRIDEE_GCP_PROJECT_ID: ${process.env.BRIDEE_GCP_PROJECT_ID}`);

const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS ?? '10000', 10);

pollTryOnQueue();

setInterval(() => {
  logger.info('Poll cycle starting...');
  pollTryOnQueue();
}, pollIntervalMs);
