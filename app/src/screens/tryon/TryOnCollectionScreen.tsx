import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import ScreenHeader from '../../components/shared/ScreenHeader';
import { getTryOnJobs, deleteTryOnJob } from '../../services/tryon/tryonService';
import { getTryOnResultUrl } from '../../lib/supabase';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { TryOnJob } from '../../types/tryon';
import type { SavedStackParamList } from '../../types/navigation';

type Props = StackScreenProps<SavedStackParamList, 'TryOnCollectionScreen'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (Math.min(SCREEN_WIDTH, 430) - 48) / 2;

type JobWithUrl = TryOnJob & { resultUrl?: string };

export default function TryOnCollectionScreen({ navigation }: Props) {
  const [jobs, setJobs] = useState<JobWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    setLoading(true);
    setErrorMessage(null);
    const { data, error } = await getTryOnJobs();
    if (error) {
      logger.error('TryOnCollectionScreen: getTryOnJobs failed', { error });
      setErrorMessage(error);
      setLoading(false);
      return;
    }

    const jobList = data ?? [];
    const withUrls = await Promise.all(
      jobList.map(async (job) => {
        if (job.status === 'completed' && job.result_path) {
          const url = await getTryOnResultUrl(job.result_path);
          return { ...job, resultUrl: url ?? undefined };
        }
        return { ...job };
      })
    );

    setJobs(withUrls);
    setLoading(false);
  }

  function handleJobPress(job: JobWithUrl) {
    navigation.navigate('TryOnResultScreen', {
      jobId: job.id,
      boutiqueDressId: job.boutique_dress_id,
    });
  }

  function handleDelete(job: JobWithUrl) {
    Alert.alert(
      t('tryon.delete_confirm_title'),
      t('tryon.delete_confirm_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tryon.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteTryOnJob(job.id);
            if (error) {
              logger.error('TryOnCollectionScreen: deleteTryOnJob failed', { error });
            } else {
              setJobs((prev) => prev.filter((j) => j.id !== job.id));
            }
          },
        },
      ]
    );
  }

  function statusLabel(status: TryOnJob['status']): string {
    switch (status) {
      case 'pending': return t('tryon.job_pending');
      case 'processing': return t('tryon.job_processing');
      case 'completed': return t('tryon.job_completed');
      case 'failed': return t('tryon.job_failed');
    }
  }

  function statusColor(status: TryOnJob['status']): string {
    switch (status) {
      case 'pending': return '#F0A500';
      case 'processing': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'failed': return '#CC3333';
    }
  }

  function renderItem({ item }: { item: JobWithUrl }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleJobPress(item)}
        activeOpacity={0.85}
        onLongPress={() => handleDelete(item)}
      >
        {item.resultUrl ? (
          <Image source={{ uri: item.resultUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardPlaceholder}>
            {item.status === 'pending' || item.status === 'processing' ? (
              <ActivityIndicator color="#C9A96E" />
            ) : (
              <Ionicons name="image-outline" size={32} color="#CCC" />
            )}
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={[styles.statusLabel, { color: statusColor(item.status) }]}>
            {statusLabel(item.status)}
          </Text>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('tryon.collection_title')} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="sparkles-outline" size={48} color="#DDD" />
          <Text style={styles.emptyTitle}>{t('tryon.collection_empty_title')}</Text>
          <Text style={styles.emptySubtitle}>{t('tryon.collection_empty_subtitle')}</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    maxWidth: 430,
    alignSelf: 'center',
    width: '100%',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#C9A96E',
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center' },

  grid: { padding: 16 },
  row: { justifyContent: 'space-between', marginBottom: 16 },

  card: {
    width: CARD_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImage: { width: CARD_SIZE, height: CARD_SIZE * 1.3 },
  cardPlaceholder: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.3,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: 11, color: '#BBB' },
});
