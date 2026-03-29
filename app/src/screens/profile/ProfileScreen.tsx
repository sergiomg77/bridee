import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'ProfileScreen'>;

type MenuItem = {
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  screen: keyof ProfileStackParamList;
};

const MENU: MenuItem[] = [
  {
    label: 'General Information',
    subtitle: 'Name, city, age, body shape',
    icon: 'person-outline',
    screen: 'GeneralInformationScreen',
  },
  {
    label: 'Bridal DNA',
    subtitle: 'Your style personality quiz',
    icon: 'sparkles-outline',
    screen: 'BridalDNAScreen',
  },
  {
    label: 'Share Your Story',
    subtitle: 'Your wedding journey',
    icon: 'book-outline',
    screen: 'ShareYourStoryScreen',
  },
  {
    label: 'Shopping Preferences',
    subtitle: 'Boutique visits, sizing, budget',
    icon: 'bag-outline',
    screen: 'ShoppingPreferencesScreen',
  },
  {
    label: 'Build Your Moodboard',
    subtitle: 'Inspiration & vision board',
    icon: 'images-outline',
    screen: 'BuildYourMoodboardScreen',
  },
  {
    label: 'Settings',
    subtitle: 'Account & preferences',
    icon: 'settings-outline',
    screen: 'SettingsScreen',
  },
];

export default function ProfileScreen({ navigation }: Props) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        logger.error('ProfileScreen: failed to get session', error);
        return;
      }
      setEmail(data.session?.user.email ?? null);
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.getParent()?.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + email */}
        <View style={styles.heroSection}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={40} color="#C9A96E" />
          </View>
          {email && <Text style={styles.emailText}>{email}</Text>}
        </View>

        {/* Menu */}
        <View style={styles.menuList}>
          {MENU.map((item, index) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.menuRow, index === MENU.length - 1 && styles.menuRowLast]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon} size={22} color="#C9A96E" />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  closeButton: { padding: 4 },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5EFE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emailText: { fontSize: 14, color: '#888' },
  menuList: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FBF4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 2 },
  menuSubtitle: { fontSize: 12, color: '#AAA' },
});
