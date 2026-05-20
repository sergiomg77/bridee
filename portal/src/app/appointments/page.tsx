'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { createClient } from '@/lib/supabase';
import PortalLayout from '@/components/PortalLayout';
import logger from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppointmentSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  capacity: number;
  booked_count: number;
}

interface Appointment {
  id: string;
  slot_id: string;
  status: string;
  full_name: string;
  phone: string;
  special_request: string | null;
  try_multiple_dresses: boolean;
  guest_count: number;
  created_at: string;
  appointment_slots: { slot_date: string; slot_time: string } | Array<{ slot_date: string; slot_time: string }> | null;
}

type Tab = 'slots' | 'appointments';
type ApptFilter = 'all' | 'pending' | 'confirmed';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSlot(appt: Appointment): { slot_date: string; slot_time: string } | null {
  if (!appt.appointment_slots) return null;
  return Array.isArray(appt.appointment_slots)
    ? (appt.appointment_slots[0] ?? null)
    : appt.appointment_slots;
}

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h ?? '0', 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled_by_bride: 'Cancelled (Bride)',
  cancelled_by_boutique: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  confirmed: 'bg-green-50 text-green-600',
  cancelled_by_bride: 'bg-red-50 text-red-500',
  cancelled_by_boutique: 'bg-gray-100 text-gray-500',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const supabase = createClient();

  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('slots');

  // ── Slots state ──────────────────────────────────────────────
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotForm, setSlotForm] = useState({ date: '', time: '09:00', capacity: '1' });
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  // ── Appointments state ───────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [apptsLoading, setApptsLoading] = useState(false);
  const [apptFilter, setApptFilter] = useState<ApptFilter>('all');
  const [updatingApptId, setUpdatingApptId] = useState<string | null>(null);

  // ── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        console.log('AppointmentsPage: init started');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('AppointmentsPage: getUser', { userId: user?.id, error: userError?.message });
        if (userError || !user) {
          setPageError('Not authenticated.');
          setPageLoading(false);
          return;
        }

        // v3: profiles has no boutique_id — query boutiques by owner_user_id
        console.log('AppointmentsPage: querying boutique for user', user.id);
        const { data: boutique, error: boutiqueError } = await supabase
          .from('boutiques')
          .select('id')
          .eq('owner_user_id', user.id)
          .limit(1)
          .single();

        console.log('AppointmentsPage: boutique result', { boutiqueId: boutique?.id, error: boutiqueError?.message });

        if (boutiqueError || !boutique) {
          logger.error('AppointmentsPage: boutique query failed', boutiqueError);
          setPageError('Failed to load boutique.');
          setPageLoading(false);
          return;
        }

        setBoutiqueId(boutique.id);
        console.log('AppointmentsPage: boutiqueId set', boutique.id);
      } catch (err) {
        logger.error('AppointmentsPage: init error', err);
        setPageError('An unexpected error occurred.');
      } finally {
        setPageLoading(false);
      }
    }
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load slots when boutiqueId ready or tab = slots ──────────
  useEffect(() => {
    if (!boutiqueId || tab !== 'slots') return;
    void loadSlots(boutiqueId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boutiqueId, tab]);

  // ── Load appointments when tab = appointments ─────────────────
  useEffect(() => {
    if (!boutiqueId || tab !== 'appointments') return;
    void loadAppointments(boutiqueId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boutiqueId, tab]);

  async function loadSlots(bid: string) {
    setSlotsLoading(true);
    const today = new Date().toISOString().split('T')[0] as string;
    const { data, error } = await supabase
      .from('appointment_slots')
      .select('id, slot_date, slot_time, capacity, booked_count')
      .eq('boutique_id', bid)
      .gte('slot_date', today)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });

    if (error) {
      logger.error('AppointmentsPage: slots query failed', error);
    } else {
      setSlots((data ?? []) as AppointmentSlot[]);
    }
    setSlotsLoading(false);
  }

  async function loadAppointments(bid: string) {
    setApptsLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('id, slot_id, status, full_name, phone, special_request, try_multiple_dresses, guest_count, created_at, appointment_slots(slot_date, slot_time)')
      .eq('boutique_id', bid)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('AppointmentsPage: appointments query failed', error);
    } else {
      setAppointments((data ?? []) as Appointment[]);
    }
    setApptsLoading(false);
  }

  async function handleAddSlot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!boutiqueId) return;

    setSlotSaving(true);
    setSlotError(null);

    const { error } = await supabase
      .from('appointment_slots')
      .insert({
        boutique_id: boutiqueId,
        slot_date: slotForm.date,
        slot_time: slotForm.time,
        capacity: parseInt(slotForm.capacity, 10) || 1,
      });

    if (error) {
      logger.error('AppointmentsPage: slot insert failed', error);
      setSlotError(error.message.includes('unique') ? 'A slot already exists at that date and time.' : error.message);
    } else {
      setSlotForm((prev) => ({ ...prev, date: '', time: '09:00', capacity: '1' }));
      void loadSlots(boutiqueId);
    }

    setSlotSaving(false);
  }

  async function handleDeleteSlot(slotId: string) {
    if (!boutiqueId) return;
    setDeletingSlotId(slotId);

    const { error } = await supabase
      .from('appointment_slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      logger.error('AppointmentsPage: slot delete failed', error);
    } else {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    }

    setDeletingSlotId(null);
  }

  async function handleUpdateAppt(apptId: string, status: string) {
    if (!boutiqueId) return;
    setUpdatingApptId(apptId);

    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', apptId);

    if (error) {
      logger.error('AppointmentsPage: appointment update failed', error);
    } else {
      setAppointments((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status } : a))
      );
    }

    setUpdatingApptId(null);
  }

  const inputClass =
    'px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent transition bg-white';

  if (pageLoading) {
    return (
      <PortalLayout title="Appointments">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </PortalLayout>
    );
  }

  if (pageError) {
    return (
      <PortalLayout title="Appointments">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-red-500">{pageError}</p>
        </div>
      </PortalLayout>
    );
  }

  const filteredAppointments = appointments.filter((a) =>
    apptFilter === 'all' ? true : a.status === apptFilter
  );

  return (
    <PortalLayout title="Appointments">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
          {(['slots', 'appointments'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                tab === t
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'slots' ? 'Availability' : 'Appointments'}
            </button>
          ))}
        </div>

        {/* ── Availability Tab ─────────────────────────────────── */}
        {tab === 'slots' && (
          <div className="space-y-6">

            {/* Add slot form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h3 className="text-base font-semibold text-gray-800 mb-6">Add Availability Slot</h3>
              <form onSubmit={handleAddSlot} className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={slotForm.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSlotForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className={`${inputClass} w-full`}
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Time</label>
                  <input
                    type="time"
                    required
                    value={slotForm.time}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSlotForm((prev) => ({ ...prev, time: e.target.value }))
                    }
                    className={`${inputClass} w-full`}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={slotForm.capacity}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSlotForm((prev) => ({ ...prev, capacity: e.target.value }))
                    }
                    className={`${inputClass} w-full`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={slotSaving}
                  className="px-6 py-3 rounded-xl bg-[#C9A96E] text-white text-sm font-semibold hover:bg-[#b8945a] disabled:opacity-60 transition"
                >
                  {slotSaving ? 'Adding…' : 'Add Slot'}
                </button>
              </form>
              {slotError && <p className="mt-3 text-xs text-red-500">{slotError}</p>}
            </div>

            {/* Upcoming slots list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Upcoming Slots</h3>
              </div>

              {slotsLoading ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-400">Loading…</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-400">No upcoming slots. Add your first slot above.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {slots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm">📅</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{formatDate(slot.slot_date)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatTime(slot.slot_time)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          slot.booked_count >= slot.capacity
                            ? 'bg-red-50 text-red-500'
                            : 'bg-green-50 text-green-600'
                        }`}>
                          {slot.booked_count}/{slot.capacity} booked
                        </span>
                        <button
                          onClick={() => void handleDeleteSlot(slot.id)}
                          disabled={slot.booked_count > 0 || deletingSlotId === slot.id}
                          title={slot.booked_count > 0 ? 'Cannot delete a booked slot' : 'Delete slot'}
                          className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          {deletingSlotId === slot.id ? 'Removing…' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Appointments Tab ─────────────────────────────────── */}
        {tab === 'appointments' && (
          <div className="space-y-6">

            {/* Filter */}
            <div className="flex gap-2">
              {(['all', 'pending', 'confirmed'] as ApptFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setApptFilter(f)}
                  className={`px-4 py-1.5 rounded-lg border text-xs font-medium transition ${
                    apptFilter === f
                      ? 'bg-[#C9A96E] border-[#C9A96E] text-white'
                      : 'border-gray-200 text-gray-500 hover:border-[#C9A96E] hover:text-[#C9A96E]'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {apptsLoading ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <p className="text-sm text-gray-400">Loading…</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <p className="text-sm text-gray-400">No appointments found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((appt) => {
                  const slot = getSlot(appt);
                  const isUpdating = updatingApptId === appt.id;
                  return (
                    <div key={appt.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-sm font-semibold text-gray-800">{appt.full_name}</p>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[appt.status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {STATUS_LABELS[appt.status] ?? appt.status}
                            </span>
                          </div>

                          {slot && (
                            <p className="text-xs text-gray-500 mb-1">
                              {formatDate(slot.slot_date)} at {formatTime(slot.slot_time)}
                            </p>
                          )}

                          <p className="text-xs text-gray-400">{appt.phone}</p>

                          {appt.guest_count > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">{appt.guest_count} guest{appt.guest_count !== 1 ? 's' : ''}</p>
                          )}

                          {appt.special_request && (
                            <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                              &ldquo;{appt.special_request}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        {(appt.status === 'pending' || appt.status === 'confirmed') && (
                          <div className="flex gap-2 flex-shrink-0">
                            {appt.status === 'pending' && (
                              <button
                                onClick={() => void handleUpdateAppt(appt.id, 'confirmed')}
                                disabled={isUpdating}
                                className="px-4 py-1.5 rounded-lg bg-[#C9A96E] text-white text-xs font-medium hover:bg-[#b8945a] disabled:opacity-60 transition"
                              >
                                Confirm
                              </button>
                            )}
                            <button
                              onClick={() => void handleUpdateAppt(appt.id, 'cancelled_by_boutique')}
                              disabled={isUpdating}
                              className="px-4 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 disabled:opacity-60 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
