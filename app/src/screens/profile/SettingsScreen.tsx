import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'SettingsScreen'>;

export default function SettingsScreen({ navigation }: Props) {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogOut() {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('SettingsScreen: signOut failed', error);
      setLoggingOut(false);
    }
    // App.tsx onAuthStateChange handles switching to AuthStack
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Profile picture placeholder */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={44} color="#C9A96E" />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.avatarHint}>Profile picture coming soon</Text>
        </View>

        {/* Log Out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logOutButton, loggingOut && styles.disabled]}
            onPress={handleLogOut}
            activeOpacity={0.8}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={styles.logOutIcon} />
                <Text style={styles.logOutText}>Log Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#333', textAlign: 'center' },
  headerSpacer: { width: 24 },
  content: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 48 },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F5EFE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C9A96E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FAFAFA',
  },
  avatarHint: { fontSize: 13, color: '#AAA' },
  section: { width: '100%' },
  logOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A96E',
    paddingVertical: 15,
    borderRadius: 12,
  },
  logOutIcon: { marginRight: 8 },
  logOutText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  disabled: { opacity: 0.6 },
});
