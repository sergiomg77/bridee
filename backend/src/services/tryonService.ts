import { ai } from '../lib/googleAI';
import { logger } from '../lib/logger';

export async function processTryOn(
  dressPhotoBase64: string,
  userPhotoBase64: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const response = await ai.models.recontextImage({
      model: 'virtual-try-on-001',
      source: {
        personImage: { imageBytes: userPhotoBase64 },
        productImages: [{ productImage: { imageBytes: dressPhotoBase64 } }],
      },
      config: {
        outputMimeType: 'image/jpeg',
        numberOfImages: 1,
      },
    });

    const resultBase64 = response.generatedImages?.[0]?.image?.imageBytes;

    if (!resultBase64) {
      const err = new Error('Google virtual-try-on-001 returned no image');
      logger.error(err.message);
      return { data: null, error: err };
    }

    return { data: resultBase64, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('processTryOn failed', error);
    return { data: null, error };
  }
}
