const supabaseUrl = process.env.EXPO_PUBLIC_BRIDEE_SUPABASE_URL ?? '';

export function getStorageUrl(bucket: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
