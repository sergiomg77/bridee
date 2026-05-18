import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getBoutiqueSlots } from '../../services/boutique/boutiqueService';
import { bookAppointment } from '../../services/appointment/appointmentService';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { AppointmentSlot } from '../../types/appointment';

type Props = {
  navigation: { goBack(): void };
  route: { params: { boutiqueId: string; boutiqueDressId?: string } };
};

export default function BookAppointmentScreen({ route, navigation }: Props) {
  const { boutiqueId, boutiqueDressId } = route.params;

  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const [tryMultiple, setTryMultiple] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSlots();
  }, []);

  async function loadSlots() {
    setLoading(true);
    const { data, error } = await getBoutiqueSlots(boutiqueId);
    if (error) {
      logger.error('BookAppointmentScreen: getBoutiqueSlots failed', { error });
      setErrorMessage(error);
    } else {
      const available = (data ?? []).filter((s) => !s.is_blocked);
      setSlots(available);
    }
    setLoading(false);
  }

  async function handleSubmit() {
    if (!selectedSlotId || !fullName.trim() || !phone.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);

    const payload: Record<string, unknown> = {
      boutique_id: boutiqueId,
      slot_id: selectedSlotId,
      full_name: fullName.trim(),
      phone: phone.trim(),
      special_request: specialRequest.trim() || null,
      guest_count: parseInt(guestCount, 10) || 1,
      try_multiple_dresses: tryMultiple,
    };

    if (boutiqueDressId) {
      payload.boutique_dress_ids = [boutiqueDressId];
    }

    const { error } = await bookAppointment(payload);

    if (error) {
      logger.error('BookAppointmentScreen: bookAppointment failed', { error });
      setErrorMessage(t('appointment.booking_failed'));
    } else {
      setSuccess(true);
    }

    setSubmitting(false);
  }

  const canSubmit = selectedSlotId !== null && fullName.trim() !== '' && phone.trim() !== '' && !submitting;

  function formatSlot(slot: AppointmentSlot): string {
    const date = new Date(slot.slot_date).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    const time = slot.slot_time.substring(0, 5);
    return `${date} · ${time}`;
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('appointment.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
          <Text style={styles.successTitle}>{t('appointment.booking_success')}</Text>
          <Text style={styles.successBody}>{t('appointment.booking_success_body')}</Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.doneButtonText}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('appointment.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>

          {/* Slot selection */}
          <Text style={styles.sectionLabel}>{t('appointment.select_slot')}</Text>
          {slots.length === 0 ? (
            <View style={styles.noSlots}>
              <Text style={styles.noSlotsText}>{t('appointment.no_slots')}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotsRow}>
              {slots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.slotChip, selectedSlotId === slot.id && styles.slotChipActive]}
                  onPress={() => setSelectedSlotId(slot.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.slotText, selectedSlotId === slot.id && styles.slotTextActive]}>
                    {formatSlot(slot)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Full Name */}
          <Text style={styles.fieldLabel}>{t('appointment.full_name')}</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('appointment.full_name')}
            placeholderTextColor="#BBB"
            returnKeyType="next"
          />

          {/* Phone */}
          <Text style={styles.fieldLabel}>{t('appointment.phone')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('appointment.phone')}
            placeholderTextColor="#BBB"
            keyboardType="phone-pad"
            returnKeyType="next"
          />

          {/* Guest count */}
          <Text style={styles.fieldLabel}>{t('appointment.guest_count')}</Text>
          <TextInput
            style={[styles.input, styles.inputSmall]}
            value={guestCount}
            onChangeText={setGuestCount}
            keyboardType="number-pad"
            maxLength={1}
          />

          {/* Try multiple */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('appointment.try_multiple')}</Text>
            <Switch
              value={tryMultiple}
              onValueChange={setTryMultiple}
              trackColor={{ true: '#C9A96E', false: '#DDD' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Special request */}
          <Text style={styles.fieldLabel}>{t('appointment.special_request')}</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={specialRequest}
            onChangeText={setSpecialRequest}
            placeholder={t('appointment.special_request')}
            placeholderTextColor="#BBB"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>{t('appointment.confirm')}</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
    maxWidth: 430,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#333' },
  headerSpacer: { width: 40 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#333', textAlign: 'center' },
  successBody: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 24 },
  doneButton: {
    marginTop: 8,
    backgroundColor: '#C9A96E',
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  doneButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  form: { padding: 20, gap: 14 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: -4,
  },
  noSlots: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  noSlotsText: { fontSize: 14, color: '#999' },
  slotsRow: { gap: 10 },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  slotChipActive: { backgroundColor: '#FFF8EE', borderColor: '#C9A96E' },
  slotText: { fontSize: 13, fontWeight: '500', color: '#666' },
  slotTextActive: { color: '#C9A96E', fontWeight: '700' },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: -6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  inputSmall: { width: 80 },
  inputMultiline: { height: 88, paddingTop: 12 },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchLabel: { fontSize: 15, color: '#333', fontWeight: '500' },

  errorText: { fontSize: 14, color: '#CC3333', textAlign: 'center' },

  submitButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
