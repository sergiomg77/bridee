export type ReferencePhotoType = 'full_body' | 'face_upper_body';

export interface ReferencePhoto {
  id: string;
  user_id: string;
  photo_type: ReferencePhotoType;
  path: string;
  created_at: string;
  updated_at: string;
}

export type TryOnStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TryOnJob {
  id: string;
  user_id: string;
  boutique_dress_id: string;
  reference_photo_id: string;
  dress_photo_id: string;
  status: TryOnStatus;
  result_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
