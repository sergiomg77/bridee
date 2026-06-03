import { GoogleGenAI } from '@google/genai';

const project = process.env.BRIDEE_GCP_PROJECT_ID;
const location = process.env.BRIDEE_GCP_REGION;

if (!project || !location) {
  throw new Error('Missing required env vars: BRIDEE_GCP_PROJECT_ID and BRIDEE_GCP_REGION must be set');
}

// On Railway: load credentials from env var.
// Locally: falls back to GOOGLE_APPLICATION_CREDENTIALS file via ADC.
const googleAuthOptions = process.env.BRIDEE_GCP_CREDENTIALS_JSON
  ? { credentials: JSON.parse(process.env.BRIDEE_GCP_CREDENTIALS_JSON) as Record<string, unknown> }
  : undefined;

export const ai = new GoogleGenAI({
  vertexai: true,
  project,
  location,
  googleAuthOptions,
});
