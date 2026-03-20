import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthMode } from '../../types/auth';

interface AuthToggleTabsProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

export default function AuthToggleTabs({ mode, onModeChange }: AuthToggleTabsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, mode === 'signin' && styles.activeTab]}
        onPress={() => onModeChange('signin')}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabText, mode === 'signin' && styles.activeTabText]}>
          Sign In
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, mode === 'signup' && styles.activeTab]}
        onPress={() => onModeChange('signup')}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>
          Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#333',
    fontWeight: '600',
  },
});
