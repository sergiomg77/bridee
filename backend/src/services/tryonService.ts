import { ai } from '../lib/googleAI';
import { logger } from '../lib/logger';

export async function processTryOn(
  referencePhotoBase64: string,
  dressPhotoBase64: string
): Promise<string> {
  logger.info('Calling virtual-try-on-001...');

  const response = await ai.models.recontextImage({
    model: 'virtual-try-on-001',
    source: {
      personImage: { imageBytes: referencePhotoBase64 },
      productImages: [{ productImage: { imageBytes: dressPhotoBase64 } }],
    },
    config: {
      outputMimeType: 'image/jpeg',
      numberOfImages: 1,
    },
  });

  const resultBase64 = response.generatedImages?.[0]?.image?.imageBytes;

  if (!resultBase64) {
    throw new Error('virtual-try-on-001 returned no image');
  }

  return resultBase64;
}
