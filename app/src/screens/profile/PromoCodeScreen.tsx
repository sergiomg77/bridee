import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { redeemPromo } from '../../services/profile/profileService';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'PromoCodeScreen'>;

export default function PromoCodeScreen({ navigation }: Props) {
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleApply() {
    const trimmed = code.trim();
    if (!trimmed || applying) return;

    setApplying(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const { error } = await redeemPromo(trimmed);

    if (error) {
      logger.error('PromoCodeScreen: redeemPromo failed', { error });
      setErrorMessage(t('promo_code.error_body'));
    } else {
      setSuccessMessage(t('promo_code.success_body'));
      setCode('');
    }

    setApplying(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('promo_code.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.iconRow}>
            <Ionicons name="pricetag-outline" size={56} color="#C9A96E" />
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={text => {
                setCode(text.toUpperCase());
                setSuccessMessage(null);
                setErrorMessage(null);
              }}
              placeholder={t('promo_code.placeholder')}
              placeholderTextColor="#BBB"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleApply}
            />
            <TouchableOpacity
              style={[styles.applyButton, (!code.trim() || applying) && styles.applyDisabled]}
              onPress={handleApply}
              disabled={!code.trim() || applying}
              activeOpacity={0.85}
            >
              {applying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.applyText}>{t('promo_code.apply')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {successMessage ? (
            <View style={styles.feedbackRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.feedbackRow}>
              <Ionicons name="close-circle" size={20} color="#E53935" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
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
  flex: { flex: 1 },

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

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  iconRow: { marginBottom: 32 },

  inputRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 2,
  },
  applyButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  applyDisabled: { opacity: 0.4 },
  applyText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  successText: { fontSize: 14, color: '#4CAF50', fontWeight: '500' },
  errorText: { fontSize: 14, color: '#E53935', fontWeight: '500' },
});
