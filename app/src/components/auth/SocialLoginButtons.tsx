import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SocialLoginButtonsProps {
  loading: boolean;
  onGooglePress: () => void;
  onApplePress: () => void;
}

export default function SocialLoginButtons({
  loading,
  onGooglePress,
  onApplePress,
}: SocialLoginButtonsProps) {
  return (
    <View>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.socialButton, loading && styles.disabled]}
        onPress={onGooglePress}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Text style={styles.socialButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.socialButton, styles.appleButton, loading && styles.disabled]}
        onPress={onApplePress}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Text style={[styles.socialButtonText, styles.appleButtonText]}>
          Continue with Apple
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E8E8',
  },
  dividerText: {
    color: '#999',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  socialButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  socialButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  appleButtonText: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.6,
  },
});
