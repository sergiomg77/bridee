import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { deleteAccount } from '../../services/profile/profileService';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'LoginSecurityScreen'>;

export default function LoginSecurityScreen({ navigation }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    setEmail(user?.email ?? null);
    if (user?.last_sign_in_at) {
      setLastLogin(formatDate(user.last_sign_in_at));
    }
    setLoading(false);
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      + ', '
      + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  async function handleChangePassword() {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      logger.error('LoginSecurityScreen: resetPasswordForEmail failed', { error: error.message });
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('common.done'), t('login_security.password_reset_sent'));
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      t('login_security.delete_confirm_title'),
      t('login_security.delete_confirm_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: confirmDelete },
      ]
    );
  }

  async function confirmDelete() {
    setDeleting(true);
    const { error } = await deleteAccount();
    if (error) {
      logger.error('LoginSecurityScreen: deleteAccount failed', { error });
      Alert.alert(t('common.error'), error);
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    // onAuthStateChange in App.tsx handles navigation to AuthStack
  }

  function renderInfoRow(
    icon: React.ComponentProps<typeof Ionicons>['name'],
    label: string,
    value: string | null
  ) {
    return (
      <View style={styles.menuItem}>
        <Ionicons name={icon} size={20} color="#555" style={styles.menuIcon} />
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuValue} numberOfLines={1}>{value ?? '—'}</Text>
      </View>
    );
  }

  function renderActionRow(
    icon: React.ComponentProps<typeof Ionicons>['name'],
    label: string,
    onPress: () => void,
    destructive = false
  ) {
    return (
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name={icon} size={20} color={destructive ? '#E53935' : '#555'} style={styles.menuIcon} />
        <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color="#CCC" />
      </TouchableOpacity>
    );
  }

  function renderSection(title: string, children: React.ReactNode) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{title}</Text>
        <View style={styles.sectionCard}>{children}</View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('login_security.title')}</Text>
        <View style={styles.topBarSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {renderSection(t('login_security.section_account'), <>
            {renderInfoRow('mail-outline', t('login_security.email_label'), email)}
            {renderInfoRow('time-outline', t('login_security.last_login'), lastLogin)}
          </>)}

          {renderSection(t('login_security.section_security'), <>
            {renderActionRow('key-outline', t('login_security.change_password'), handleChangePassword)}
            {renderActionRow('trash-outline', t('login_security.delete_account'), handleDeleteAccount, true)}
          </>)}
        </ScrollView>
      )}

      {deleting && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { padding: 4, marginRight: 8 },
  topBarTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#333' },
  topBarSpacer: { width: 36 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },

  section: { marginTop: 20 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAA',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuIcon: { marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, color: '#333' },
  menuLabelDestructive: { color: '#E53935' },
  menuValue: { fontSize: 13, color: '#AAA', marginRight: 8, maxWidth: 180 },

  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
