import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { getReferencePhotos, uploadReferencePhoto } from '../../services/tryon/tryonService';
import { getTryOnResultUrl } from '../../lib/supabase';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { ReferencePhoto, ReferencePhotoType } from '../../types/tryon';

type Props = {
  navigation: {
    goBack(): void;
    navigate(screen: 'TryOnScreen', params: { boutiqueDressId: string }): void;
  };
  route: { params: { boutiqueDressId: string } };
};

type PhotoSlot = {
  type: ReferencePhotoType;
  label: string;
  photo: ReferencePhoto | null;
  signedUrl: string | null;
  uploading: boolean;
};

export default function ReferencePhotoScreen({ route, navigation }: Props) {
  const { boutiqueDressId } = route.params;

  const [slots, setSlots] = useState<PhotoSlot[]>([
    { type: 'full_body', label: t('tryon.full_body'), photo: null, signedUrl: null, uploading: false },
    { type: 'face_upper_body', label: t('tryon.face_upper_body'), photo: null, signedUrl: null, uploading: false },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotos();
  }, []);

  async function loadPhotos() {
    const { data, error } = await getReferencePhotos();
    if (error) {
      logger.error('ReferencePhotoScreen: getReferencePhotos failed', { error });
      setLoading(false);
      return;
    }

    const photos = data ?? [];
    const urlResults = await Promise.all(
      photos.map((p) => getTryOnResultUrl(p.path))
    );

    setSlots((prev) =>
      prev.map((slot) => {
        const idx = photos.findIndex((p) => p.photo_type === slot.type);
        if (idx !== -1) {
          return { ...slot, photo: photos[idx], signedUrl: urlResults[idx] ?? null };
        }
        return slot;
      })
    );

    setLoading(false);
  }

  async function handleUpload(type: ReferencePhotoType) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.base64) {
      Alert.alert('Error', 'Failed to read image. Please try again.');
      return;
    }

    setSlots((prev) =>
      prev.map((s) => (s.type === type ? { ...s, uploading: true } : s))
    );

    const { data, error } = await uploadReferencePhoto(type, asset.base64);

    if (error || !data) {
      logger.error('ReferencePhotoScreen: uploadReferencePhoto failed', { error });
      setSlots((prev) =>
        prev.map((s) => (s.type === type ? { ...s, uploading: false } : s))
      );
      Alert.alert('Upload failed', error ?? 'Please try again.');
      return;
    }

    const signedUrl = await getTryOnResultUrl(data.path);

    setSlots((prev) =>
      prev.map((s) =>
        s.type === type
          ? { ...s, photo: data, signedUrl: signedUrl ?? null, uploading: false }
          : s
      )
    );
  }

  const hasAnyPhoto = slots.some((s) => s.photo !== null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('tryon.reference_title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.bodyText}>{t('tryon.reference_body')}</Text>

        {loading ? (
          <ActivityIndicator color="#C9A96E" size="large" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.slotsRow}>
            {slots.map((slot) => (
              <View key={slot.type} style={styles.slotCard}>
                <TouchableOpacity
                  style={styles.photoArea}
                  onPress={() => handleUpload(slot.type)}
                  activeOpacity={0.85}
                  disabled={slot.uploading}
                >
                  {slot.uploading ? (
                    <ActivityIndicator color="#C9A96E" />
                  ) : slot.signedUrl ? (
                    <Image
                      source={{ uri: slot.signedUrl }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="camera-outline" size={36} color="#CCC" />
                    </View>
                  )}

                  {slot.photo && !slot.uploading && (
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.slotLabel}>{slot.label}</Text>
                <Text style={styles.slotStatus}>
                  {slot.uploading
                    ? t('common.loading')
                    : slot.photo
                    ? t('tryon.reference_uploaded')
                    : t('tryon.reference_upload')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !hasAnyPhoto && styles.continueButtonDisabled]}
          onPress={() => navigation.navigate('TryOnScreen', { boutiqueDressId })}
          disabled={!hasAnyPhoto}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>{t('tryon.reference_continue')}</Text>
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: { width: 40 },

  body: { flex: 1, padding: 24 },
  bodyText: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 32 },

  slotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  slotCard: { alignItems: 'center', gap: 10 },
  photoArea: {
    width: 140,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: { width: 140, height: 180 },
  photoPlaceholder: {
    width: 140,
    height: 180,
    backgroundColor: '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E8E0D8',
    borderStyle: 'dashed',
  },
  uploadedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  slotLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  slotStatus: { fontSize: 12, color: '#C9A96E', fontWeight: '500' },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  continueButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: { opacity: 0.5 },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
