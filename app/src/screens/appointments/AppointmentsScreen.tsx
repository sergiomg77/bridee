import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { getAppointments, cancelAppointment } from '../../services/appointment/appointmentService';
import { formatRelativeTime } from '../../utils/date';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { Appointment, AppointmentStatus } from '../../types/appointment';
import type { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'AppointmentsScreen'>;
type Tab = 'upcoming' | 'past';

function isUpcoming(appt: Appointment): boolean {
  if (appt.status === 'cancelled_by_bride' || appt.status === 'cancelled_by_boutique') return false;
  const slotDate = new Date(appt.slot.slot_date);
  return slotDate >= new Date(new Date().toDateString());
}

function getStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'pending': return t('appointment.status_pending');
    case 'confirmed': return t('appointment.status_confirmed');
    case 'cancelled_by_bride': return t('appointment.status_cancelled_bride');
    case 'cancelled_by_boutique': return t('appointment.status_cancelled_boutique');
  }
}

function getStatusColor(status: AppointmentStatus): string {
  switch (status) {
    case 'confirmed': return '#4CAF50';
    case 'pending': return '#F5A623';
    case 'cancelled_by_bride':
    case 'cancelled_by_boutique':
      return '#E53935';
  }
}

function formatSlotDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

export default function AppointmentsScreen({ navigation }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);

    const { data, error } = await getAppointments();
    if (error) {
      logger.error('AppointmentsScreen: getAppointments failed', { error });
      setErrorMessage(error);
    } else {
      setAppointments(data ?? []);
    }

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }

  function handleCancelConfirm(id: string) {
    Alert.alert(
      t('appointments.cancel_confirm_title'),
      t('appointments.cancel_confirm_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('appointments.cancel'),
          style: 'destructive',
          onPress: () => doCancel(id),
        },
      ]
    );
  }

  async function doCancel(id: string) {
    const { error } = await cancelAppointment(id);
    if (error) {
      logger.error('AppointmentsScreen: cancelAppointment failed', { error });
      Alert.alert(t('common.error'), error);
    } else {
      load();
    }
  }

  const upcoming = appointments
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.slot.slot_date).getTime() - new Date(b.slot.slot_date).getTime());

  const past = appointments
    .filter(a => !isUpcoming(a))
    .sort((a, b) => new Date(b.slot.slot_date).getTime() - new Date(a.slot.slot_date).getTime());

  const displayed = activeTab === 'upcoming' ? upcoming : past;

  function renderCard({ item }: { item: Appointment }) {
    const canCancel = item.status === 'pending' || item.status === 'confirmed';
    const statusColor = getStatusColor(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.boutiqueName} numberOfLines={1}>{item.boutique_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color="#888" />
          <Text style={styles.dateText}>
            {formatSlotDate(item.slot.slot_date)} {item.slot.slot_time}
          </Text>
        </View>

        {item.guest_count > 0 ? (
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={14} color="#888" />
            <Text style={styles.detailText}>{item.guest_count} {t('appointments.guests')}</Text>
          </View>
        ) : null}

        {item.dresses && item.dresses.length > 0 ? (
          <View style={styles.detailRow}>
            <Ionicons name="shirt-outline" size={14} color="#888" />
            <Text style={styles.detailText} numberOfLines={1}>
              {t('appointments.dresses')}: {item.dresses.map(d => d.dresses?.title ?? d.sku).join(', ')}
            </Text>
          </View>
        ) : null}

        {item.special_request ? (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-outline" size={14} color="#888" />
            <Text style={styles.detailText} numberOfLines={2}>{item.special_request}</Text>
          </View>
        ) : null}

        {canCancel ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelConfirm(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>{t('appointments.cancel')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('appointments.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            {t('appointments.tab_upcoming')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            {t('appointments.tab_past')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => load()}>
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#C9A96E" />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="calendar-outline" size={48} color="#DDD" />
              <Text style={styles.emptyTitle}>
                {activeTab === 'upcoming'
                  ? t('appointments.empty_upcoming')
                  : t('appointments.empty_past')}
              </Text>
              {activeTab === 'upcoming' ? (
                <Text style={styles.emptySubtitle}>{t('appointments.empty_upcoming_body')}</Text>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    maxWidth: 430,
    alignSelf: 'center',
    width: '100%',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center' },
  retryButton: { backgroundColor: '#C9A96E', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#333', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#333' },
  headerSpacer: { width: 40 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#C9A96E' },
  tabText: { fontSize: 15, fontWeight: '500', color: '#888' },
  tabTextActive: { color: '#C9A96E', fontWeight: '700' },

  list: { padding: 16, gap: 12, paddingBottom: 32 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  boutiqueName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#333', marginRight: 10 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  dateText: { fontSize: 14, color: '#555', fontWeight: '500' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  detailText: { flex: 1, fontSize: 13, color: '#888', lineHeight: 18 },

  cancelButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E53935',
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#E53935' },
});
