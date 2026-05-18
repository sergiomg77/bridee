import type { BoutiqueDress } from './dress';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled_by_bride'
  | 'cancelled_by_boutique';

export interface AppointmentSlot {
  id: string;
  boutique_id: string;
  slot_date: string;
  slot_time: string;
  is_blocked: boolean;
}

export interface AppointmentDress {
  appointment_id: string;
  boutique_dress_id: string;
}

export interface Appointment {
  id: string;
  boutique_id: string;
  user_id: string;
  slot_id: string;
  status: AppointmentStatus;
  full_name: string;
  phone: string;
  special_request: string | null;
  try_multiple_dresses: boolean;
  guest_count: number;
  created_at: string;
  updated_at: string;
  slot: AppointmentSlot;
  boutique_name: string;
  dresses: BoutiqueDress[];
}
