import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import type { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'TermsScreen'>;

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using the Bridee application ("App"), you agree to be bound by these Terms & Policies. If you do not agree, please do not use the App. Bridee reserves the right to update these terms at any time. Continued use of the App after changes constitutes acceptance of the revised terms.',
  },
  {
    title: '2. Use of the App',
    body: 'Bridee is a discovery and marketplace platform connecting brides with wedding-related products and services. You must be at least 18 years old to use the App. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree not to use the App for any unlawful purpose or in any way that could damage, disable, or impair the App or its services.',
  },
  {
    title: '3. Vendor and Boutique Listings',
    body: 'Bridee acts as an intermediary platform only. We do not own, operate, or control any boutiques, vendors, or services listed on the App. All transactions, agreements, and disputes arising between users and vendors or boutiques are solely between those parties. Bridee is not responsible for the quality, safety, legality, or accuracy of any listings, products, or services offered by third parties on the platform.',
  },
  {
    title: '4. User Content',
    body: 'By submitting content to the App (including photos, reviews, and messages), you grant Bridee a non-exclusive, royalty-free, worldwide licence to use, display, and distribute that content in connection with the App\'s operation. You confirm that you own or have the necessary rights to any content you submit, and that it does not infringe any third-party rights or violate any applicable laws.',
  },
  {
    title: '5. Virtual Try-On',
    body: 'The virtual try-on feature is provided for entertainment and inspiration purposes only. Results are AI-generated and may not accurately represent how a garment will look in person. Bridee makes no warranty regarding the accuracy or fitness of try-on results for any particular purpose.',
  },
  {
    title: '6. Intellectual Property',
    body: 'All content, trademarks, logos, and intellectual property displayed on the App are owned by or licensed to Bridee. You may not reproduce, distribute, or create derivative works from any App content without prior written permission from Bridee.',
  },
  {
    title: '7. Limitation of Liability',
    body: 'To the fullest extent permitted by applicable law, Bridee and its affiliates, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App, including but not limited to loss of data, loss of profits, or any transactions conducted through the platform. Bridee\'s total liability for any claim shall not exceed the amount you paid to Bridee in the twelve months preceding the claim, or USD 100, whichever is greater.',
  },
  {
    title: '8. Privacy',
    body: 'Your use of the App is also governed by our Privacy Policy. We collect and process personal data as described therein. By using the App, you consent to such collection and processing. We do not sell your personal data to third parties. Data may be shared with service providers solely for the purpose of operating the App.',
  },
  {
    title: '9. Governing Law',
    body: 'These Terms shall be governed by and construed in accordance with the laws of Vietnam. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Ho Chi Minh City, Vietnam.',
  },
  {
    title: '10. Contact',
    body: 'If you have any questions about these Terms & Policies, please contact us at legal@bridee.app.',
  },
];

export default function TermsScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Terms & Policies</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.lastUpdated}>Last updated: June 2026</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
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

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 16,
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
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
});
