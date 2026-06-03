import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import type { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'HelpCentreScreen'>;

const BULLETS = [
  'Make sure your app is updated to the latest version',
  'Check your internet connection',
  'Try logging out and back in',
  'For virtual try-on issues, ensure your reference photo meets the guidelines (clear, full body, plain background)',
  'For boutique or vendor inquiries, contact them directly via the in-app inbox',
];

function openEmail(address: string) {
  Linking.openURL(`mailto:${address}`).catch(() => {
    Alert.alert('Error', 'Unable to open email client.');
  });
}

export default function HelpCentreScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Help Centre</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <Ionicons name="help-circle-outline" size={56} color="#C9A96E" style={styles.heroIcon} />
          <Text style={styles.heroHeading}>We're here to help</Text>
          <Text style={styles.heroSubtext}>
            If you're experiencing any issues with the app or have a question about our services, our support team is happy to assist.
          </Text>
        </View>

        <View style={styles.content}>
          {/* Contact Support */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Support</Text>
            <Text style={styles.sectionBody}>
              For any issues, questions, or feedback, please reach out to us directly by email. We aim to respond within 1–2 business days.
            </Text>
            <TouchableOpacity style={styles.emailButton} onPress={() => openEmail('support@bridee.app')} activeOpacity={0.7}>
              <Ionicons name="mail-outline" size={20} color="#C9A96E" style={styles.emailIcon} />
              <Text style={styles.emailText}>support@bridee.app</Text>
            </TouchableOpacity>
          </View>

          {/* Before You Write */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Before You Write</Text>
            <Text style={styles.sectionBody}>
              Before reaching out, you might find your answer here:
            </Text>
            <View style={styles.bulletList}>
              {BULLETS.map((item) => (
                <Text key={item} style={styles.bulletItem}>{'•   '}{item}</Text>
              ))}
            </View>
          </View>

          {/* Partnerships & Business */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Partnerships & Business</Text>
            <Text style={styles.sectionBody}>
              For boutique onboarding, vendor partnerships, or business enquiries, please contact us at:
            </Text>
            <TouchableOpacity style={styles.emailButton} onPress={() => openEmail('partners@bridee.app')} activeOpacity={0.7}>
              <Ionicons name="mail-outline" size={20} color="#C9A96E" style={styles.emailIcon} />
              <Text style={styles.emailText}>partners@bridee.app</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>Bridee Support — Available Monday to Friday</Text>
          <Text style={styles.footer}>Response time: 1–2 business days</Text>
        </View>
      </ScrollView>
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

  scroll: { paddingBottom: 48 },

  hero: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  heroIcon: { marginBottom: 16 },
  heroHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  heroSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    marginTop: 24,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C9A96E',
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C9A96E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  emailIcon: { marginRight: 10 },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#C9A96E',
  },

  bulletList: { marginTop: 10 },
  bulletItem: {
    fontSize: 14,
    color: '#555',
    lineHeight: 24,
    marginBottom: 4,
  },

  footer: {
    color: '#AAA',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
