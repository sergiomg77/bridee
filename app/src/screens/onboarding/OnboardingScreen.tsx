import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { t } from '../../i18n';
import logger from '../../lib/logger';

type Props = {
  navigation: { replace(screen: 'MainTabs'): void };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'heart-outline' as const,
    titleKey: 'onboarding.step1_title',
    bodyKey: 'onboarding.step1_body',
    color: '#F5EDE0',
    iconColor: '#C9A96E',
  },
  {
    icon: 'git-compare-outline' as const,
    titleKey: 'onboarding.step2_title',
    bodyKey: 'onboarding.step2_body',
    color: '#EEF4F0',
    iconColor: '#5A8A6E',
  },
  {
    icon: 'sparkles-outline' as const,
    titleKey: 'onboarding.step3_title',
    bodyKey: 'onboarding.step3_body',
    color: '#F0EEF8',
    iconColor: '#7B6EA6',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  async function finish() {
    try {
      await AsyncStorage.setItem('bridee_onboarding_done', 'true');
    } catch (err) {
      logger.error('OnboardingScreen: failed to save onboarding flag', err);
    }
    navigation.replace('MainTabs');
  }

  function handleNext() {
    if (activeIndex < SLIDES.length - 1) {
      const nextIndex = activeIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
      setActiveIndex(nextIndex);
    } else {
      finish();
    }
  }

  const isLast = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={finish} activeOpacity={0.7} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={styles.slide}>
            <View style={[styles.iconCircle, { backgroundColor: s.color }]}>
              <Ionicons name={s.icon} size={72} color={s.iconColor} />
            </View>
            <Text style={styles.slideTitle}>{t(s.titleKey)}</Text>
            <Text style={styles.slideBody}>{t(s.bodyKey)}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {/* Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: slide.iconColor }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {isLast ? t('onboarding.get_started') : t('onboarding.next')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
    maxWidth: 430,
    alignSelf: 'center',
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipButton: { padding: 8 },
  skipText: { fontSize: 14, color: '#999', fontWeight: '500' },

  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideBody: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: '#C9A96E', width: 24 },
  dotInactive: { backgroundColor: '#DDD' },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
