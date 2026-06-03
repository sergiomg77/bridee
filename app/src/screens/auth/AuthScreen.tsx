import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import AuthToggleTabs from '../../components/auth/AuthToggleTabs';
import AuthFormFields from '../../components/auth/AuthFormFields';
import SocialLoginButtons from '../../components/auth/SocialLoginButtons';
import EmailConfirmationView from '../../components/auth/EmailConfirmationView';
import { signIn, signUp, signInWithGoogle, signInWithApple } from '../../services/auth/authService';
import { getLocale, setLanguage } from '../../i18n';
import logger from '../../lib/logger';
import { AuthMode } from '../../types/auth';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [locale, setLocale] = useState<'vi' | 'en'>(getLocale());

  function clearError() {
    setErrorMessage(null);
  }

  function handleModeChange(next: AuthMode) {
    clearError();
    setMode(next);
  }

  function handleBackToSignIn() {
    setShowConfirmation(false);
    setEmail('');
    setPassword('');
    clearError();
    setMode('signin');
  }

  async function handleToggleLanguage() {
    const next = locale === 'vi' ? 'en' : 'vi';
    await setLanguage(next);
    setLocale(next);
  }

  async function handleSubmit() {
    clearError();
    setLoading(true);

    if (mode === 'signin') {
      const { data: session, error } = await signIn({ email, password });
      setLoading(false);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      logger.info('signIn successful', { userId: session?.user?.id });
      // TODO: navigate to home screen
      return;
    }

    const { data: session, error } = await signUp({ email, password });
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (session === null) {
      // Email confirmation required — session not issued yet
      setShowConfirmation(true);
      return;
    }

    logger.info('signUp successful — session issued immediately', { userId: session.user?.id });
    // TODO: navigate to home screen
  }

  async function handleGooglePress() {
    clearError();
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleApplePress() {
    clearError();
    setLoading(true);
    const { error } = await signInWithApple();
    setLoading(false);
    if (error) {
      setErrorMessage(error.message);
    }
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar style="dark" />

        <Text style={styles.logo}>Bridee</Text>
        <Text style={styles.tagline}>Find your perfect dress</Text>

        {showConfirmation ? (
          <EmailConfirmationView onBackToSignIn={handleBackToSignIn} />
        ) : (
          <>
            <AuthToggleTabs mode={mode} onModeChange={handleModeChange} />

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <AuthFormFields
              mode={mode}
              email={email}
              password={password}
              loading={loading}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleSubmit}
            />

            <SocialLoginButtons
              loading={loading}
              onGooglePress={handleGooglePress}
              onApplePress={handleApplePress}
            />
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.langToggle} onPress={handleToggleLanguage} activeOpacity={0.7}>
        <Ionicons name="language-outline" size={15} color="#C9A96E" />
        <Text style={styles.langToggleText}>{locale.toUpperCase()}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 42,
    fontWeight: '700',
    color: '#C9A96E',
    letterSpacing: 2,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#999',
    marginBottom: 40,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFCCCC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#CC3333',
    fontSize: 14,
  },
  langToggle: {
    position: 'absolute',
    top: 52,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C9A96E',
    backgroundColor: '#FAFAFA',
  },
  langToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C9A96E',
  },
});
