import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getDressDetail } from '../../services/dress/dressService';
import { getReferencePhotos, createTryOnJob } from '../../services/tryon/tryonService';
import { getTryOnResultUrl } from '../../lib/supabase';
import { getStorageUrl } from '../../utils/image';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { NestedDressPhoto } from '../../types/dress';
import type { ReferencePhoto } from '../../types/tryon';

type Props = {
  navigation: {
    goBack(): void;
    navigate(screen: 'ReferencePhotoScreen', params: { boutiqueDressId: string }): void;
    navigate(screen: 'TryOnResultScreen', params: { jobId: string; boutiqueDressId: string }): void;
  };
  route: { params: { boutiqueDressId: string } };
};

type RefPhotoWithUrl = ReferencePhoto & { signedUrl: string | null };

export default function TryOnScreen({ route, navigation }: Props) {
  const { boutiqueDressId } = route.params;

  const [eligiblePhotos, setEligiblePhotos] = useState<NestedDressPhoto[]>([]);
  const [referencePhotos, setReferencePhotos] = useState<RefPhotoWithUrl[]>([]);
  const [selectedDressPhotoId, setSelectedDressPhotoId] = useState<string | null>(null);
  const [selectedRefPhotoId, setSelectedRefPhotoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setErrorMessage(null);

    const [dressResult, refResult] = await Promise.all([
      getDressDetail(boutiqueDressId),
      getReferencePhotos(),
    ]);

    if (dressResult.error || !dressResult.data) {
      setErrorMessage(dressResult.error ?? t('dress_detail.not_found'));
      setLoading(false);
      return;
    }

    const eligible = (dressResult.data.dresses?.dress_photos ?? []).filter((p) => p.is_tryon_eligible);
    setEligiblePhotos(eligible);
    if (eligible.length > 0) setSelectedDressPhotoId(eligible[0].id);

    const refs = refResult.data ?? [];
    const urlResults = await Promise.all(refs.map((r) => getTryOnResultUrl(r.path)));
    const refWithUrls: RefPhotoWithUrl[] = refs.map((r, i) => ({
      ...r,
      signedUrl: urlResults[i] ?? null,
    }));
    setReferencePhotos(refWithUrls);
    if (refWithUrls.length > 0) setSelectedRefPhotoId(refWithUrls[0].id);

    setLoading(false);
  }

  async function handleCreate() {
    if (!selectedDressPhotoId || !selectedRefPhotoId) return;
    setCreating(true);
    setErrorMessage(null);

    const { data, error } = await createTryOnJob(boutiqueDressId, selectedDressPhotoId);

    if (error || !data) {
      logger.error('TryOnScreen: createTryOnJob failed', { error });
      setErrorMessage(error ?? t('common.error'));
      setCreating(false);
      return;
    }

    navigation.navigate('TryOnResultScreen', { jobId: data.id, boutiqueDressId });
  }

  const canCreate = selectedDressPhotoId !== null && selectedRefPhotoId !== null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('tryon.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
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
        <Text style={styles.headerTitle}>{t('tryon.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Dress photo selection */}
        <Text style={styles.sectionLabel}>{t('tryon.select_dress_photo')}</Text>
        {eligiblePhotos.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t('tryon.no_eligible_photos')}</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {eligiblePhotos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                onPress={() => setSelectedDressPhotoId(photo.id)}
                activeOpacity={0.85}
                style={[
                  styles.dressPhotoCard,
                  selectedDressPhotoId === photo.id && styles.dressPhotoCardSelected,
                ]}
              >
                <Image
                  source={{ uri: getStorageUrl('dress-photos', photo.path) }}
                  style={styles.dressPhoto}
                  resizeMode="cover"
                />
                {selectedDressPhotoId === photo.id && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={22} color="#C9A96E" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Reference photo selection */}
        <Text style={styles.sectionLabel}>{t('tryon.select_reference')}</Text>
        {referencePhotos.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t('tryon.no_reference_photos')}</Text>
            <TouchableOpacity
              style={styles.uploadRefButton}
              onPress={() => navigation.navigate('ReferencePhotoScreen', { boutiqueDressId })}
              activeOpacity={0.85}
            >
              <Text style={styles.uploadRefText}>{t('tryon.reference_upload')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {referencePhotos.map((ref) => (
              <TouchableOpacity
                key={ref.id}
                onPress={() => setSelectedRefPhotoId(ref.id)}
                activeOpacity={0.85}
                style={[
                  styles.refPhotoCard,
                  selectedRefPhotoId === ref.id && styles.refPhotoCardSelected,
                ]}
              >
                {ref.signedUrl ? (
                  <Image
                    source={{ uri: ref.signedUrl }}
                    style={styles.refPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.refPhotoPlaceholder}>
                    <Ionicons name="person-outline" size={32} color="#CCC" />
                  </View>
                )}
                <Text style={styles.refPhotoLabel} numberOfLines={1}>
                  {ref.photo_type === 'full_body' ? t('tryon.full_body') : t('tryon.face_upper_body')}
                </Text>
                {selectedRefPhotoId === ref.id && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={22} color="#C9A96E" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addRefCard}
              onPress={() => navigation.navigate('ReferencePhotoScreen', { boutiqueDressId })}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={32} color="#C9A96E" />
              <Text style={styles.addRefText}>{t('tryon.reference_upload')}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startButton, (!canCreate || creating) && styles.startButtonDisabled]}
          onPress={handleCreate}
          disabled={!canCreate || creating}
          activeOpacity={0.85}
        >
          {creating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
              <Text style={styles.startButtonText}>{t('tryon.start')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingVertical: 24, gap: 16 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
  },

  photoRow: { paddingHorizontal: 20, gap: 12 },

  dressPhotoCard: {
    width: 110,
    height: 145,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  dressPhotoCardSelected: { borderColor: '#C9A96E' },
  dressPhoto: { width: '100%', height: '100%' },

  refPhotoCard: {
    width: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    alignItems: 'center',
  },
  refPhotoCardSelected: { borderColor: '#C9A96E' },
  refPhoto: { width: 100, height: 130 },
  refPhotoPlaceholder: {
    width: 100,
    height: 130,
    backgroundColor: '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refPhotoLabel: {
    fontSize: 11,
    color: '#666',
    paddingVertical: 6,
    textAlign: 'center',
    paddingHorizontal: 4,
  },

  addRefCard: {
    width: 100,
    height: 145,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8E0D8',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addRefText: { fontSize: 11, color: '#C9A96E', fontWeight: '600' },

  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },

  emptyBox: {
    marginHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
  uploadRefButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  uploadRefText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  errorText: {
    fontSize: 14,
    color: '#CC3333',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  startButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonDisabled: { opacity: 0.5 },
  startButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
