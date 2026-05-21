import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';

import ScreenHeader from '../../components/shared/ScreenHeader';
import { getExplore } from '../../services/dress/dressService';
import { getFeed } from '../../services/dress/dressService';
import { getProfile } from '../../services/profile/profileService';
import { t } from '../../i18n';
import { formatPrice } from '../../utils/currency';
import { getStorageUrl } from '../../utils/image';
import { navigationRef } from '../../navigation/navigationRef';
import type { BoutiqueDress } from '../../types/dress';
import { ExploreStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ExploreStackParamList, 'ExploreScreen'>;

type ExploreData = {
  trending: BoutiqueDress[];
  top: BoutiqueDress[];
  new_arrivals: BoutiqueDress[];
  hot_deals: BoutiqueDress[];
};

type FilterTab = 'all' | 'city' | 'marketplace' | 'live';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 160;
const CARD_HEIGHT = CARD_WIDTH * 1.35;

export default function ExploreScreen({ navigation }: Props) {
  const [exploreData, setExploreData] = useState<ExploreData | null>(null);
  const [cityDresses, setCityDresses] = useState<BoutiqueDress[]>([]);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setErrorMessage(null);

    const [exploreResult, profileResult] = await Promise.all([
      getExplore(),
      getProfile(),
    ]);

    if (exploreResult.error) {
      setErrorMessage(exploreResult.error);
    } else {
      const d = exploreResult.data;
      setExploreData({
        trending: d?.trending ?? [],
        top: d?.top ?? [],
        new_arrivals: d?.new_arrivals ?? [],
        hot_deals: d?.hot_deals ?? [],
      });
    }

    if (profileResult.data?.city) {
      setUserCity(profileResult.data.city);
    }

    setLoading(false);
  }

  const loadCityDresses = useCallback(async () => {
    if (!userCity) return;
    const { data } = await getFeed({ city: userCity });
    setCityDresses(data ?? []);
  }, [userCity]);

  useEffect(() => {
    if (activeTab === 'city' && userCity) {
      loadCityDresses();
    }
  }, [activeTab, userCity, loadCityDresses]);

  function handleTabPress(tab: FilterTab) {
    if (tab === 'marketplace') {
      if (navigationRef.isReady()) {
        (navigationRef.current as { navigate?: (name: string) => void } | null)?.navigate?.('Marketplace');
      }
      return;
    }
    if (tab === 'live') {
      Alert.alert('LIVE', t('common.coming_soon') ?? 'Coming Soon');
      return;
    }
    setActiveTab(tab);
  }

  function handleCardPress(boutiqueDressId: string) {
    navigation.navigate('DressDetailScreen', { boutiqueDressId });
  }

  function renderCard(item: BoutiqueDress, showDiscount = false) {
    const coverPath = item.dresses?.dress_photos?.find((p) => p.sort_order === 0)?.path ?? null;
    const imageUri = coverPath ? getStorageUrl('dress-photos', coverPath) : null;
    const hasDeal = showDiscount && item.deal_active && item.deal_percent !== null;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => handleCardPress(item.id)}
        activeOpacity={0.85}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder} />
        )}
        {hasDeal && (
          <View style={styles.dealBadge}>
            <Text style={styles.dealBadgeText}>-{item.deal_percent}%</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.dresses?.title}</Text>
          <Text style={styles.cardBoutique} numberOfLines={1}>{item.boutiques?.name}</Text>
          {item.price_sale !== null && (
            <View style={styles.priceRow}>
              <Text style={styles.cardPrice}>
                {formatPrice(item.price_sale, item.price_currency)}
              </Text>
              {hasDeal && item.price_original !== null && (
                <Text style={styles.cardOriginalPrice}>
                  {formatPrice(item.price_original, item.price_currency)}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function renderSection(
    title: string,
    items: BoutiqueDress[] | undefined | null,
    showDiscount = false
  ) {
    if (!items || items.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionList}
          renderItem={({ item }) => renderCard(item, showDiscount)}
        />
      </View>
    );
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Explore' },
    { key: 'city', label: userCity ?? 'Near Me' },
    { key: 'marketplace', label: 'Marketplace' },
    { key: 'live', label: 'LIVE' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('explore.title')} />

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRow}
        contentContainerStyle={styles.tabContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
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
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'city' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderSection(userCity ?? 'Near Me', cityDresses)}
          {cityDresses.length === 0 && (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No dresses found for your city.</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {exploreData && (
            <>
              {renderSection('Trending', exploreData.trending)}
              {renderSection('Top Dresses', exploreData.top)}
              {renderSection('New Arrivals', exploreData.new_arrivals)}
              {renderSection('Hot Deals', exploreData.hot_deals, true)}
            </>
          )}
          {!exploreData && (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Nothing to explore yet.</Text>
            </View>
          )}
        </ScrollView>
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
    marginRight: 4,
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 200,
  },
  errorText: {
    fontSize: 15,
    color: '#CC3333',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  seeAll: {
    fontSize: 13,
    color: '#C9A96E',
    fontWeight: '500',
  },
  sectionList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardImagePlaceholder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#F0EDE8',
  },
  dealBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E53935',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dealBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  cardBoutique: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C9A96E',
  },
  cardOriginalPrice: {
    fontSize: 11,
    color: '#BBB',
    textDecorationLine: 'line-through',
  },
});
