import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthMode } from '../../types/auth';

interface AuthFormFieldsProps {
  mode: AuthMode;
  email: string;
  password: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export default function AuthFormFields({
  mode,
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: AuthFormFieldsProps) {
  const submitLabel = mode === 'signin' ? 'Log In' : 'Create Account';

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={onPasswordChange}
        secureTextEntry
        editable={!loading}
      />
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        onPress={onSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
