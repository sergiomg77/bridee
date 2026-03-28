import { GoogleGenAI } from '@google/genai';

const project = process.env.BRIDEE_GCP_PROJECT_ID;
const location = process.env.BRIDEE_GCP_REGION;

if (!project || !location) {
  throw new Error('Missing required env vars: BRIDEE_GCP_PROJECT_ID and BRIDEE_GCP_REGION must be set');
}

export const ai = new GoogleGenAI({ vertexai: true, project, location });
