import React, { useState } from 'react';
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
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import { addToTryOnQueue } from '../../services/tryon/tryonService';
import { SavedStackParamList } from '../../types/navigation';

type Props = StackScreenProps<SavedStackParamList, 'TryOnInstructionScreen'>;

// Attempt to load step instruction images.
// Add step1.png, step2.png, step3.png to app/assets/tryon/ when ready.
let step1Source: number | null = null;
let step2Source: number | null = null;
let step3Source: number | null = null;
try {
  step1Source = require('../../../assets/tryon/step1.png') as number;
} catch (_) { /* file not yet added */ }
try {
  step2Source = require('../../../assets/tryon/step2.png') as number;
} catch (_) { /* file not yet added */ }
try {
  step3Source = require('../../../assets/tryon/step3.png') as number;
} catch (_) { /* file not yet added */ }

const STEPS: { key: string; source: number | null }[] = [
  { key: 'step1', source: step1Source },
  { key: 'step2', source: step2Source },
  { key: 'step3', source: step3Source },
];

export default function TryOnInstructionScreen({ route, navigation }: Props) {
  const { dressId, tryOnPhotoPath } = route.params;

  const [uploading, setUploading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleUploadPhoto() {
    setPermissionError(null);
    setUploadError(null);

    // a. Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setPermissionError('Please allow access to your photo library to continue.');
      return;
    }

    // b. Open image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) {
      setUploadError('Failed to select an image. Please try again.');
      return;
    }

    setUploading(true);

    try {
      // Get authenticated session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        logger.error('TryOnInstructionScreen: getSession failed', sessionError);
        setUploadError('Not authenticated. Please sign in again.');
        return;
      }
      const userId = sessionData.session.user.id;

      // c. Upload user photo to tryon-photos bucket
      const storagePath = `uploads/${userId}-${dressId}-${Date.now()}-tryon.jpg`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: storageError } = await supabase.storage
        .from('tryon-photos')
        .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: false });

      if (storageError) {
        logger.error('TryOnInstructionScreen: storage upload failed', storageError);
        setUploadError(storageError.message);
        return;
      }

      // d. Insert into tryon_queue
      const { error: queueError } = await addToTryOnQueue(supabase, {
        userId,
        dressId,
        dressPhotoPath: tryOnPhotoPath,
        userPhotoPath: storagePath,
      });

      if (queueError) {
        setUploadError(queueError);
        return;
      }

      // e. Show confirmation
      setSubmitted(true);
    } catch (err) {
      logger.error('TryOnInstructionScreen: unexpected error', err);
      setUploadError('An unexpected error occurred. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Try it on</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Instruction cards */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {STEPS.map((step) => (
          <View key={step.key} style={styles.card}>
            {step.source !== null ? (
              <Image
                source={step.source}
                style={styles.stepImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder} />
            )}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {permissionError ? (
          <Text style={styles.errorText}>{permissionError}</Text>
        ) : null}
        {uploadError ? (
          <Text style={styles.errorText}>{uploadError}</Text>
        ) : null}

        {submitted ? (
          <>
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                Your photo is being processed. We will notify you when your try-on is ready!
              </Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, uploading && styles.primaryButtonDisabled]}
            onPress={handleUploadPhoto}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Upload your photo</Text>
            )}
          </TouchableOpacity>
        )}
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

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  stepImage: {
    width: 280,
    height: 180,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: 280,
    height: 180,
    borderRadius: 12,
    backgroundColor: '#ECECEC',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 14,
    color: '#CC3333',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#F0F7EE',
    borderRadius: 12,
    padding: 16,
  },
  successText: {
    fontSize: 15,
    color: '#3A7D44',
    textAlign: 'center',
    lineHeight: 22,
  },
});
