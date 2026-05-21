import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger } from './lib/logger';
import { pollTryOnQueue } from './workers/tryonWorker';
import { startStuckJobsWorker } from './workers/stuckJobsWorker';
import usersRouter from './routes/users';
import boutiquesRouter from './routes/boutiques';
import dressesRouter from './routes/dresses';
import swipesRouter from './routes/swipes';
import tryonRouter from './routes/tryon';
import appointmentsRouter from './routes/appointments';
import conversationsRouter from './routes/conversations';
import marketplaceRouter from './routes/marketplace';
import vendorsRouter from './routes/vendors';
import searchRouter from './routes/search';
import adminRouter from './routes/admin';

// Bridge credentials path for Google SDK
if (process.env.BRIDEE_GOOGLE_CREDENTIALS_PATH) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.BRIDEE_GOOGLE_CREDENTIALS_PATH;
}

// ── Express app ──────────────────────────────────────────────
const app = express();
app.use(cors());
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path} — origin: ${req.headers.origin}`);
  next();
});
app.use(express.json({ limit: '10mb' })); // 10 MB to accommodate base64 reference photo uploads

app.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok', timestamp: new Date().toISOString() }, error: null });
});

// Group 2
app.use('/api/users', usersRouter);
app.use('/api/boutiques', boutiquesRouter);
app.use('/api/dresses', dressesRouter);
app.use('/api/swipes', swipesRouter);

// Group 3
app.use('/api/tryon', tryonRouter);

// Group 4
app.use('/api/appointments', appointmentsRouter);
app.use('/api/conversations', conversationsRouter);

// Group 5
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/search', searchRouter);
app.use('/api/admin', adminRouter);

const port = parseInt(process.env.BRIDEE_PORT ?? '3001', 10);
app.listen(port, () => {
  logger.info(`Bridee API server listening on port ${port}`);
});

// ── Workers ──────────────────────────────────────────────────
const pollIntervalMs = parseInt(
  process.env.BRIDEE_POLL_INTERVAL_MS ?? process.env.POLL_INTERVAL_MS ?? '10000',
  10
);

logger.info(`Bridee backend starting — poll interval: ${pollIntervalMs}ms`);
logger.info(`BRIDEE_SUPABASE_URL: ${process.env.BRIDEE_SUPABASE_URL}`);
logger.info(`BRIDEE_GCP_PROJECT_ID: ${process.env.BRIDEE_GCP_PROJECT_ID}`);

pollTryOnQueue();

setInterval(() => {
  logger.info('Poll cycle starting...');
  pollTryOnQueue();
}, pollIntervalMs);

startStuckJobsWorker();
