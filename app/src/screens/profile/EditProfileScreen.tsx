import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { getProfile, updateProfile } from '../../services/profile/profileService';
import { uploadAvatar } from '../../services/storage/storageService';
import { getStorageUrl } from '../../utils/image';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { UserProfile } from '../../types/profile';
import type { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'EditProfileScreen'>;

const STYLE_TAGS = [
  'Bohemian',
  'Classic',
  'Modern',
  'Romantic',
  'Minimalist',
  'Vintage',
  'Glamorous',
  'Rustic',
  'Beach',
  'Princess',
  'A-Line',
  'Ballgown',
];

export default function EditProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [stylePrefs, setStylePrefs] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await getProfile();
    if (error || !data) {
      logger.error('EditProfileScreen: getProfile failed', { error });
      setLoading(false);
      return;
    }
    setProfile(data);
    setFullName(data.full_name ?? '');
    setPhone(data.phone ?? '');
    setCity(data.city ?? '');
    setBudgetMin(data.budget_min != null ? String(data.budget_min) : '');
    setBudgetMax(data.budget_max != null ? String(data.budget_max) : '');
    setStylePrefs(data.style_preferences ?? []);
    if (data.avatar_path) {
      setAvatarUri(getStorageUrl('avatars', data.avatar_path));
    }
    setLoading(false);
  }

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64 || !profile) return;

    setUploadingAvatar(true);
    const base64 = result.assets[0].base64;
    const localUri = result.assets[0].uri;

    const { path, error } = await uploadAvatar(profile.id, base64);
    if (error || !path) {
      logger.error('EditProfileScreen: uploadAvatar failed', { error });
      Alert.alert(t('common.error'), t('edit_profile.upload_error'));
      setUploadingAvatar(false);
      return;
    }

    const { error: updateError } = await updateProfile({ avatar_path: path });
    if (updateError) {
      logger.error('EditProfileScreen: updateProfile avatar_path failed', { error: updateError });
    } else {
      setAvatarUri(localUri);
    }
    setUploadingAvatar(false);
  }

  function toggleStyle(tag: string) {
    setStylePrefs(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  async function handleSave() {
    setSaving(true);

    const payload: Partial<UserProfile> = {
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      city: city.trim() || null,
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      style_preferences: stylePrefs.length ? stylePrefs : null,
    };

    const { error } = await updateProfile(payload);
    if (error) {
      logger.error('EditProfileScreen: updateProfile failed', { error });
      Alert.alert(t('common.error'), error);
    } else {
      Alert.alert(t('edit_profile.saved'), undefined, [
        { text: t('common.done'), onPress: () => navigation.goBack() },
      ]);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
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
        <Text style={styles.headerTitle}>{t('edit_profile.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8} disabled={uploadingAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={44} color="#C9A96E" />
                </View>
              )}
              <View style={styles.cameraBadge}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>{t('edit_profile.change_photo')}</Text>
          </View>

          {/* Fields */}
          <View style={styles.fieldsSection}>
            <Text style={styles.fieldLabel}>{t('edit_profile.full_name')}</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('edit_profile.full_name')}
              placeholderTextColor="#BBB"
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>{t('edit_profile.phone')}</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('edit_profile.phone')}
              placeholderTextColor="#BBB"
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>{t('edit_profile.city')}</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder={t('edit_profile.city')}
              placeholderTextColor="#BBB"
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>{t('edit_profile.budget')}</Text>
            <View style={styles.budgetRow}>
              <TextInput
                style={[styles.input, styles.budgetInput]}
                value={budgetMin}
                onChangeText={setBudgetMin}
                placeholder={t('edit_profile.budget_min')}
                placeholderTextColor="#BBB"
                keyboardType="numeric"
              />
              <View style={styles.budgetDash} />
              <TextInput
                style={[styles.input, styles.budgetInput]}
                value={budgetMax}
                onChangeText={setBudgetMax}
                placeholder={t('edit_profile.budget_max')}
                placeholderTextColor="#BBB"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Style preferences */}
          <View style={styles.stylesSection}>
            <Text style={styles.fieldLabel}>{t('edit_profile.style_preferences')}</Text>
            <View style={styles.chipGrid}>
              {STYLE_TAGS.map(tag => {
                const isSelected = stylePrefs.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => toggleStyle(tag)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('edit_profile.save')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  flex: { flex: 1 },
  scroll: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F5EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#C9A96E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: { fontSize: 13, color: '#C9A96E', fontWeight: '500', marginTop: 10 },

  fieldsSection: { backgroundColor: '#FFFFFF', padding: 20, marginTop: 16 },
  stylesSection: { backgroundColor: '#FFFFFF', padding: 20, marginTop: 1 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budgetInput: { flex: 1 },
  budgetDash: {
    width: 12,
    height: 2,
    backgroundColor: '#CCC',
    borderRadius: 1,
  },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipActive: { backgroundColor: '#C9A96E', borderColor: '#C9A96E' },
  chipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },

  saveButton: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
