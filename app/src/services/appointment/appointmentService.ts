import { apiFetch } from '../api';
import { API } from '../../constants/api';
import type { Appointment } from '../../types/appointment';

export async function getAppointments(): Promise<{ data: Appointment[] | null; error: string | null }> {
  return apiFetch<Appointment[]>(API.appointments.list(), { method: 'GET' });
}

export async function bookAppointment(
  data: object
): Promise<{ data: Appointment | null; error: string | null }> {
  return apiFetch<Appointment>(API.appointments.list(), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelAppointment(
  id: string
): Promise<{ data: null; error: string | null }> {
  return apiFetch<null>(API.appointments.cancel(id), { method: 'PUT' });
}
