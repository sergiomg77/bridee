import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';

import { getTryOnJob } from '../../services/tryon/tryonService';
import { getTryOnResultUrl } from '../../lib/supabase';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { TryOnJob } from '../../types/tryon';

type Props = {
  navigation: {
    goBack(): void;
    navigate(screen: 'DressDetailScreen', params: { boutiqueDressId: string }): void;
  };
  route: { params: { jobId: string; boutiqueDressId: string } };
};

const POLL_INTERVAL_MS = 5000;

export default function TryOnResultScreen({ route, navigation }: Props) {
  const { jobId, boutiqueDressId } = route.params;

  const [job, setJob] = useState<TryOnJob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadJob();
    return () => stopPolling();
  }, []);

  async function loadJob() {
    setLoading(true);
    const { data, error } = await getTryOnJob(jobId);
    if (error || !data) {
      logger.error('TryOnResultScreen: getTryOnJob failed', { error });
      setErrorMessage(error ?? t('common.error'));
      setLoading(false);
      return;
    }

    setJob(data);

    if (data.status === 'completed' && data.result_path) {
      const url = await getTryOnResultUrl(data.result_path);
      setResultUrl(url ?? null);
      stopPolling();
    } else if (data.status === 'pending' || data.status === 'processing') {
      startPolling();
    } else if (data.status === 'failed') {
      stopPolling();
    }

    setLoading(false);
  }

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const { data, error } = await getTryOnJob(jobId);
      if (error || !data) return;

      setJob(data);

      if (data.status === 'completed' && data.result_path) {
        const url = await getTryOnResultUrl(data.result_path);
        setResultUrl(url ?? null);
        stopPolling();
      } else if (data.status === 'failed') {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
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

  async function handleDownload() {
    if (!resultUrl) return;
    try {
      const dest = `${FileSystem.cacheDirectory ?? ''}tryon_result.jpg`;
      const { uri } = await FileSystem.downloadAsync(resultUrl, dest);
      await Share.share({ url: uri, title: 'Your try-on result' });
    } catch (err) {
      logger.error('TryOnResultScreen: download failed', { err });
      Alert.alert('Download failed', 'Could not save the image.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('tryon.result_title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadJob}>
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : job ? (
        <View style={styles.body}>
          {/* Result image */}
          {job.status === 'completed' && resultUrl ? (
            <Image
              source={{ uri: resultUrl }}
              style={styles.resultImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.resultPlaceholder}>
              {job.status === 'pending' || job.status === 'processing' ? (
                <>
                  <ActivityIndicator color="#C9A96E" size="large" />
                  <Text style={styles.processingText}>{statusLabel(job.status)}</Text>
                  <Text style={styles.processingSubtext}>We'll refresh automatically</Text>
                </>
              ) : (
                <>
                  <Ionicons name="alert-circle-outline" size={48} color="#CC3333" />
                  <Text style={styles.failedText}>{statusLabel(job.status)}</Text>
                </>
              )}
            </View>
          )}

          {/* Status badge */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor(job.status)}20` }]}>
              <Text style={[styles.statusText, { color: statusColor(job.status) }]}>
                {statusLabel(job.status)}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {new Date(job.created_at).toLocaleDateString()}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {job.status === 'completed' && (
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownload}
                activeOpacity={0.85}
              >
                <Ionicons name="download-outline" size={18} color="#C9A96E" />
                <Text style={styles.downloadText}>{t('tryon.download')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.viewDressButton}
              onPress={() => navigation.navigate('DressDetailScreen', { boutiqueDressId })}
              activeOpacity={0.85}
            >
              <Text style={styles.viewDressText}>{t('tryon.view_dress')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
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

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#C9A96E',
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  body: { flex: 1 },

  resultImage: {
    flex: 1,
    width: '100%',
  },
  resultPlaceholder: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  processingText: { fontSize: 16, fontWeight: '600', color: '#333' },
  processingSubtext: { fontSize: 13, color: '#999' },
  failedText: { fontSize: 16, fontWeight: '600', color: '#CC3333' },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  dateText: { fontSize: 12, color: '#BBB' },

  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#C9A96E',
    borderRadius: 12,
    paddingVertical: 14,
  },
  downloadText: { fontSize: 14, fontWeight: '600', color: '#C9A96E' },
  viewDressButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    paddingVertical: 14,
  },
  viewDressText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
