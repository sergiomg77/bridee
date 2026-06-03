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

type Props = StackScreenProps<ProfileStackParamList, 'AboutScreen'>;

const SECTIONS = [
  {
    title: 'Our Story',
    body: 'Bridee was born from a simple idea: finding a wedding dress should feel magical, not overwhelming. We built a platform that puts the bride at the center — combining the joy of discovery with the power of AI, so every bride can explore thousands of styles, try them on virtually, and connect with trusted boutiques and vendors all in one place.',
  },
  {
    title: 'What We Do',
    body: 'Bridee brings together the best of the wedding world in one app. Discover and swipe through thousands of wedding dresses from curated boutiques across Vietnam and beyond. Use our AI-powered virtual try-on to see how a dress looks on you before ever visiting a boutique. Explore a growing marketplace of wedding vendors — photographers, makeup artists, florists, venues, and more. Book appointments, message boutiques directly, compare your favorites, and make confident decisions with real reviews from real brides.',
  },
  {
    title: 'Our Values',
    body: 'We believe every bride deserves to feel seen, heard, and celebrated. We are committed to making the wedding planning journey less stressful and more joyful — through thoughtful design, honest information, and a community built on trust. We work only with vetted boutiques and vendors who share our commitment to quality and care.',
  },
  {
    title: 'For Boutiques & Vendors',
    body: 'Bridee is not just for brides. We partner with wedding boutiques and vendors across the region to help them reach the right brides at the right moment. If you own a boutique or offer wedding services, join Bridee and grow your business with a platform built for the industry. Tap "Register Your Boutique" or "Become a Bridee Partner" in your profile to get started.',
  },
  {
    title: 'The Technology',
    body: "At the heart of Bridee is a commitment to smart, purposeful technology. Our virtual try-on feature uses Google's state-of-the-art AI to generate realistic previews of how you'd look in any dress. Our discovery feed learns from your preferences to surface the styles most likely to inspire you. Everything is designed to feel effortless — because your focus should be on the excitement, not the effort.",
  },
  {
    title: 'Contact Us',
    body: "We'd love to hear from you. Whether you have a question, a suggestion, or just want to say hello — reach out at hello@bridee.app. For business partnerships and boutique onboarding, contact us at partners@bridee.app.",
  },
];

export default function AboutScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>About Bridee</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>Making wedding dress dreams come true 💍</Text>

        <Text style={styles.hero}>
          Bridee is your personal wedding style companion — a smart, beautiful app built to help brides discover, explore, and fall in love with the perfect dress and the perfect vendors for their big day.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <Text style={styles.footer}>Bridee © 2026. Made with love for brides everywhere. 💍</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
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
  subtitle: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 16,
    marginBottom: 20,
  },
  hero: {
    fontSize: 16,
    color: '#C9A96E',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    paddingHorizontal: 8,
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
  footer: {
    textAlign: 'center',
    color: '#AAA',
    fontSize: 12,
    marginTop: 8,
  },
  version: {
    textAlign: 'center',
    color: '#CCC',
    fontSize: 11,
    marginTop: 4,
  },
});
