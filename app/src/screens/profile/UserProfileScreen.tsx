import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Share,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';

const WINDOW_HEIGHT = Dimensions.get('window').height;
import { StackScreenProps } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { getProfile, updateProfile } from '../../services/profile/profileService';
import { getCurrentUserEmail } from '../../services/auth/authService';
import { getStorageUrl } from '../../utils/image';
import { getLocale, setLanguage, t } from '../../i18n';
import { navigationRef } from '../../navigation/navigationRef';
import logger from '../../lib/logger';
import type { UserProfile } from '../../types/profile';
import type { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'UserProfileScreen'>;

const APP_VERSION = '1.0.0';

type QuickAction =
  | 'coming_soon'
  | 'saved_dresses'
  | 'saved_tryons'
  | 'saved_boutiques'
  | 'orders';

type QuickItem = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  labelKey: string;
  action: QuickAction;
};

const QUICK_ITEMS: QuickItem[] = [
  { key: 'bridal_dna', icon: 'sparkles-outline', labelKey: 'user_profile.bridal_dna_quiz', action: 'coming_soon' },
  { key: 'saved_dresses', icon: 'heart-outline', labelKey: 'user_profile.saved_dresses', action: 'saved_dresses' },
  { key: 'saved_tryons', icon: 'body-outline', labelKey: 'user_profile.saved_tryons', action: 'saved_tryons' },
  { key: 'saved_boutiques', icon: 'storefront-outline', labelKey: 'user_profile.saved_boutiques', action: 'saved_boutiques' },
  { key: 'orders', icon: 'calendar-outline', labelKey: 'user_profile.orders_booking', action: 'orders' },
  { key: 'design_dress', icon: 'color-palette-outline', labelKey: 'user_profile.design_dress', action: 'coming_soon' },
  { key: 'moodboard', icon: 'images-outline', labelKey: 'user_profile.build_moodboard', action: 'coming_soon' },
  { key: 'plan_wedding', icon: 'ribbon-outline', labelKey: 'user_profile.plan_wedding', action: 'coming_soon' },
];

export default function UserProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'vi' | 'en'>(getLocale());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [profileResult, userEmail] = await Promise.all([
      getProfile(),
      getCurrentUserEmail(),
    ]);
    if (profileResult.data) setProfile(profileResult.data);
    setEmail(userEmail);
    setLoading(false);
  }

  function showComingSoon() {
    Alert.alert(t('user_profile.coming_soon_title'), t('user_profile.coming_soon_body'));
  }

  function handleQuickItem(action: QuickAction) {
    switch (action) {
      case 'coming_soon':
        showComingSoon();
        break;
      case 'saved_dresses':
        navigationRef.dispatch(CommonActions.navigate({ name: 'SavedScreen' }));
        break;
      case 'saved_tryons':
        navigationRef.dispatch(CommonActions.navigate({ name: 'TryOnCollectionScreen' }));
        break;
      case 'saved_boutiques':
        navigation.navigate('SavedBoutiquesScreen');
        break;
      case 'orders':
        navigation.navigate('AppointmentsScreen');
        break;
    }
  }

  async function handleChangePassword() {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      logger.error('UserProfileScreen: resetPasswordForEmail failed', { error: error.message });
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('common.done'), t('user_profile.password_reset_sent'));
    }
  }

  function handleLanguage() {
    setShowLangPicker(true);
  }

  async function selectLanguage(lang: 'vi' | 'en') {
    setShowLangPicker(false);
    setSelectedLang(lang);
    await setLanguage(lang);
    await updateProfile({ language: lang });
  }

  async function handleLogOut() {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('UserProfileScreen: signOut failed', { error: error.message });
      setLoggingOut(false);
    }
    // App.tsx onAuthStateChange handles navigation to AuthStack
  }

  function handleHelpCentre() {
    Linking.openURL('https://help.bridee.com').catch(() => {
      Alert.alert(t('common.error'), 'Unable to open link.');
    });
  }

  function handleRegisterBoutique() {
    Linking.openURL('https://partners.bridee.com/register').catch(() => {
      Alert.alert(t('common.error'), 'Unable to open link.');
    });
  }

  function handleBecomePartner() {
    Linking.openURL('https://vendors.bridee.com/register').catch(() => {
      Alert.alert(t('common.error'), 'Unable to open link.');
    });
  }

  function handleAbout() {
    Alert.alert(t('user_profile.about_bridee'), `${t('user_profile.version')} ${APP_VERSION}`);
  }

  async function handleShareFeedback() {
    try {
      await Share.share({ message: 'I love using Bridee to find my dream wedding dress! 💍' });
    } catch {
      // user cancelled
    }
  }

  const avatarUri =
    profile?.avatar_path ? getStorageUrl('avatars', profile.avatar_path) : null;

  const currentLangLabel =
    selectedLang === 'vi' ? t('user_profile.language_vi') : t('user_profile.language_en');

  function renderMenuItem(
    icon: React.ComponentProps<typeof Ionicons>['name'],
    label: string,
    onPress: () => void,
    rightText?: string
  ) {
    return (
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name={icon} size={20} color="#555" style={styles.menuIcon} />
        <Text style={styles.menuLabel}>{label}</Text>
        {rightText ? <Text style={styles.menuRight}>{rightText}</Text> : null}
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>{t('user_profile.title')}</Text>
          <TouchableOpacity onPress={() => navigation.getParent()?.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{t('user_profile.title')}</Text>
        <TouchableOpacity onPress={() => navigation.getParent()?.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Avatar + name */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#C9A96E" />
              </View>
            )}
          </View>
          {profile?.full_name ? (
            <Text style={styles.heroName}>{profile.full_name}</Text>
          ) : null}
          {email ? <Text style={styles.heroEmail}>{email}</Text> : null}
        </View>

        {/* Quick access grid */}
        <View style={styles.quickGrid}>
          {QUICK_ITEMS.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.quickCell}
              onPress={() => handleQuickItem(item.action)}
              activeOpacity={0.75}
            >
              <View style={styles.quickIcon}>
                <Ionicons name={item.icon} size={22} color="#C9A96E" />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Settings */}
        {renderSection(t('user_profile.section_account'), <>
          {renderMenuItem('person-outline', t('user_profile.edit_profile'), () => navigation.navigate('EditProfileScreen'))}
          {renderMenuItem('key-outline', t('user_profile.change_password'), handleChangePassword)}
          {renderMenuItem('notifications-outline', t('user_profile.notification_prefs'), showComingSoon)}
        </>)}

        {/* Membership & Rewards */}
        {renderSection(t('user_profile.section_membership'), <>
          {renderMenuItem('medal-outline', t('user_profile.membership_plan'), showComingSoon)}
          {renderMenuItem('pricetag-outline', t('user_profile.promo_codes'), () => navigation.navigate('PromoCodeScreen'))}
          {renderMenuItem('star-outline', t('user_profile.membership_tier'), showComingSoon)}
          {renderMenuItem('share-social-outline', t('user_profile.refer_friend'), showComingSoon)}
        </>)}

        {/* General */}
        {renderSection(t('user_profile.section_general'), <>
          {renderMenuItem('language-outline', t('user_profile.language'), handleLanguage, currentLangLabel)}
          {renderMenuItem('shield-outline', t('user_profile.login_security'), showComingSoon)}
        </>)}

        {/* Support */}
        {renderSection(t('user_profile.section_support'), <>
          {renderMenuItem('help-circle-outline', t('user_profile.help_centre'), handleHelpCentre)}
          {renderMenuItem('document-text-outline', t('user_profile.terms_policies'), showComingSoon)}
          {renderMenuItem('information-circle-outline', t('user_profile.about_bridee'), handleAbout)}
          {renderMenuItem('chatbubble-ellipses-outline', t('user_profile.share_feedback'), handleShareFeedback)}
        </>)}

        {/* Opportunities */}
        {renderSection(t('user_profile.section_opportunities'), <>
          {renderMenuItem('storefront-outline', t('user_profile.register_boutique'), handleRegisterBoutique)}
          {renderMenuItem('briefcase-outline', t('user_profile.become_partner'), handleBecomePartner)}
        </>)}

        {/* Log Out */}
        <TouchableOpacity
          style={[styles.logOutButton, loggingOut && styles.logOutDisabled]}
          onPress={handleLogOut}
          disabled={loggingOut}
          activeOpacity={0.8}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.logOutText}>{t('user_profile.log_out')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.versionRow}>
          <Text style={styles.versionText}>{t('user_profile.version')} {APP_VERSION}</Text>
        </View>
      </ScrollView>

      <Modal
        visible={showLangPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangPicker(false)}
      >
        <TouchableOpacity
          style={styles.langOverlay}
          activeOpacity={1}
          onPress={() => setShowLangPicker(false)}
        >
          <View style={styles.langSheet}>
            <Text style={styles.langTitle}>{t('user_profile.language_select')}</Text>

            {(['vi', 'en'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={styles.langOption}
                onPress={() => selectLanguage(lang)}
                activeOpacity={0.7}
              >
                <Text style={[styles.langOptionText, selectedLang === lang && styles.langOptionActive]}>
                  {lang === 'vi' ? t('user_profile.language_vi') : t('user_profile.language_en')}
                </Text>
                {selectedLang === lang && <Ionicons name="checkmark" size={18} color="#C9A96E" />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.langCancel} onPress={() => setShowLangPicker(false)} activeOpacity={0.7}>
              <Text style={styles.langCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: Platform.OS === 'web' ? undefined : 1,
    maxHeight: Platform.OS === 'web' ? WINDOW_HEIGHT * 0.85 : undefined,
    backgroundColor: '#F5F5F5',
    maxWidth: 430,
    alignSelf: 'center',
    width: '100%',
  },
  scrollView: { flex: 1 },
  scroll: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  closeBtn: { padding: 4 },

  heroSection: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarWrapper: { marginBottom: 12 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F5EFE6',
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F5EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 4 },
  heroEmail: { fontSize: 14, color: '#888' },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 8,
  },
  quickCell: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDF6ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
  },

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
  menuRight: { fontSize: 13, color: '#AAA', marginRight: 8 },

  logOutButton: {
    marginHorizontal: 20,
    marginTop: 28,
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logOutDisabled: { opacity: 0.5 },
  logOutText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  versionRow: { alignItems: 'center', marginTop: 20 },
  versionText: { fontSize: 12, color: '#CCC' },

  langOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  langSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  langTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  langOptionText: { fontSize: 16, color: '#333' },
  langOptionActive: { color: '#C9A96E', fontWeight: '600' },
  langCancel: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  langCancelText: { fontSize: 15, color: '#999' },
});
