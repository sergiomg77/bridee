import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface EmailConfirmationViewProps {
  onBackToSignIn: () => void;
}

export default function EmailConfirmationView({ onBackToSignIn }: EmailConfirmationViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✉️</Text>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.message}>
        We sent you a confirmation link to complete your sign up.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onBackToSignIn} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  icon: {
    fontSize: 48,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    width: '100%',
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
