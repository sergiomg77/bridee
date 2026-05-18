import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';

import ScreenHeader from '../../components/shared/ScreenHeader';
import DressCard from '../../components/discover/DressCard';
import { getFeed } from '../../services/dress/dressService';
import { recordSwipe } from '../../services/swipe/swipeService';
import { STYLE_TAGS } from '../../constants/dress';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { BoutiqueDress } from '../../types/dress';
import type { DiscoverStackParamList } from '../../types/navigation';

type Props = StackScreenProps<DiscoverStackParamList, 'DiscoverScreen'>;

export default function DiscoverScreen({ navigation }: Props) {
  const [dresses, setDresses] = useState<BoutiqueDress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    loadFeed(activeTag);
  }, [activeTag]);

  async function loadFeed(tag: string | null) {
    setLoading(true);
    setCurrentIndex(0);
    const filters = tag ? { style_tag: tag } : undefined;
    const { data, error } = await getFeed(filters);
    if (error) {
      setErrorMessage(error);
    } else {
      setDresses(data ?? []);
      setErrorMessage(null);
    }
    setLoading(false);
  }

  async function handleLike() {
    const dress = dresses[currentIndex];
    if (!dress) return;
    const { error } = await recordSwipe(dress.id, 'like');
    if (error) logger.error('DiscoverScreen: like failed', { error });
    setCurrentIndex((prev) => prev + 1);
  }

  async function handleSkip() {
    const dress = dresses[currentIndex];
    if (!dress) return;
    const { error } = await recordSwipe(dress.id, 'skip');
    if (error) logger.error('DiscoverScreen: skip failed', { error });
    setCurrentIndex((prev) => prev + 1);
  }

  function handleCardPress() {
    const dress = dresses[currentIndex];
    if (!dress) return;
    navigation.navigate('DressDetailScreen', { boutiqueDressId: dress.id });
  }

  const currentDress = dresses[currentIndex];
  const tags: (string | null)[] = [null, ...STYLE_TAGS];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('discover.title')} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRow}
        contentContainerStyle={styles.tabContent}
      >
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag ?? '__all__'}
            style={[styles.tab, activeTag === tag && styles.tabActive]}
            onPress={() => setActiveTag(tag)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabLabel, activeTag === tag && styles.tabLabelActive]}>
              {tag ?? t('discover.filter_all')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadFeed(activeTag)}>
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : currentDress ? (
        <View style={styles.cardContainer}>
          <DressCard
            key={currentDress.id}
            dress={currentDress}
            onLike={handleLike}
            onSkip={handleSkip}
            onPress={handleCardPress}
          />
        </View>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>{t('discover.empty_title')}</Text>
          <Text style={styles.emptySubtitle}>{t('discover.empty_subtitle')}</Text>
        </View>
      )}
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
  tabRow: {
    flexGrow: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  tabActive: {
    backgroundColor: '#C9A96E',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#CC3333',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#C9A96E',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
  },
});
