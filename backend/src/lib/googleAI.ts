import { GoogleGenAI } from '@google/genai';

const project = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_REGION;

if (!project || !location) {
  throw new Error('Missing required env vars: GCP_PROJECT_ID and GCP_REGION must be set');
}

export const ai = new GoogleGenAI({ vertexai: true, project, location });
