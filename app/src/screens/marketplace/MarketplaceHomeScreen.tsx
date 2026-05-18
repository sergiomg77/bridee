import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { getCategories, getListings } from '../../services/marketplace/marketplaceService';
import { getStorageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/currency';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { MarketplaceCategory, VendorListing } from '../../types/marketplace';
import type { MarketplaceStackParamList } from '../../types/navigation';
import ScreenHeader from '../../components/shared/ScreenHeader';

type Props = StackScreenProps<MarketplaceStackParamList, 'MarketplaceHomeScreen'>;

type Section = {
  category: MarketplaceCategory;
  listings: VendorListing[];
};

export default function MarketplaceHomeScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);

    const { data: cats, error: catsError } = await getCategories();
    if (catsError || !cats) {
      logger.error('MarketplaceHomeScreen: getCategories failed', { error: catsError });
      setError(catsError ?? t('common.error'));
      setLoading(false);
      return;
    }

    const active = cats.filter(c => c.is_active).sort((a, b) => a.sort_order - b.sort_order);
    setCategories(active);

    const topCategories = active.slice(0, 3);
    const listingResults = await Promise.all(topCategories.map(c => getListings(c.id)));

    const newSections: Section[] = topCategories
      .map((cat, i) => ({
        category: cat,
        listings: (listingResults[i].data ?? []).slice(0, 8),
      }))
      .filter(s => s.listings.length > 0);

    setSections(newSections);
    setLoading(false);
  }

  function getCoverPhotoUrl(listing: VendorListing): string | null {
    const cover = listing.photos.find(p => p.sort_order === 0) ?? listing.photos[0];
    return cover ? getStorageUrl('vendor-photos', cover.path) : null;
  }

  function getDisplayPrice(listing: VendorListing): string {
    const active = listing.packages
      .filter(p => p.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (!active.length) return '';
    const pkg = active[0];
    if (pkg.pricing_model === 'quote' || pkg.price === null) return t('marketplace.contact_for_quote');
    const price = formatPrice(pkg.price, pkg.price_currency);
    if (pkg.pricing_model === 'per_hour') return price + t('marketplace.per_hour');
    return price;
  }

  function renderCategoryItem({ item }: { item: MarketplaceCategory }) {
    const iconName = (item.icon_name ?? 'grid-outline') as React.ComponentProps<typeof Ionicons>['name'];
    return (
      <TouchableOpacity
        style={styles.categoryCell}
        onPress={() =>
          navigation.navigate('CategoryListingScreen', {
            categoryId: item.id,
            categoryName: item.name,
          })
        }
        activeOpacity={0.75}
      >
        <View style={styles.categoryIcon}>
          <Ionicons name={iconName} size={24} color="#C9A96E" />
        </View>
        <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
      </TouchableOpacity>
    );
  }

  function renderListingCard(listing: VendorListing) {
    const photoUrl = getCoverPhotoUrl(listing);
    const price = getDisplayPrice(listing);
    return (
      <TouchableOpacity
        key={listing.id}
        style={styles.listingCard}
        onPress={() => navigation.navigate('VendorListingScreen', { listingId: listing.id })}
        activeOpacity={0.8}
      >
        <View style={styles.listingImageWrapper}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.listingImage} resizeMode="cover" />
          ) : (
            <View style={[styles.listingImage, styles.listingImagePlaceholder]}>
              <Ionicons name="image-outline" size={28} color="#DDD" />
            </View>
          )}
          {listing.is_new && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>{t('marketplace.new_badge')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.listingTitle} numberOfLines={1}>{listing.title}</Text>
        <Text style={styles.listingVendor} numberOfLines={1}>{listing.vendor_name}</Text>
        {price ? <Text style={styles.listingPrice} numberOfLines={1}>{price}</Text> : null}
      </TouchableOpacity>
    );
  }

  function renderSection(section: Section) {
    return (
      <View key={section.category.id} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.category.name}</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('CategoryListingScreen', {
                categoryId: section.category.id,
                categoryName: section.category.name,
              })
            }
            activeOpacity={0.7}
          >
            <Text style={styles.seeAll}>{t('marketplace.see_all')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listingRow}
        >
          {section.listings.map(renderListingCard)}
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('marketplace.title')} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{t('marketplace.hero_title')}</Text>
            <Text style={styles.heroSubtitle}>{t('marketplace.hero_subtitle')}</Text>
          </View>

          {categories.length > 0 && (
            <View style={styles.categoriesSection}>
              <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                renderItem={renderCategoryItem}
                numColumns={3}
                scrollEnabled={false}
                columnWrapperStyle={styles.categoryRow}
              />
            </View>
          )}

          {sections.map(renderSection)}
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
  scroll: { paddingBottom: 32 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center' },
  retryButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  hero: {
    backgroundColor: '#FDF6ED',
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8D8',
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 6 },
  heroSubtitle: { fontSize: 14, color: '#888' },

  categoriesSection: { paddingTop: 20, paddingHorizontal: 12 },
  categoryRow: { justifyContent: 'space-around', marginBottom: 12 },
  categoryCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDF6ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: { fontSize: 11, color: '#555', textAlign: 'center', fontWeight: '500' },

  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  seeAll: { fontSize: 13, color: '#C9A96E', fontWeight: '600' },
  listingRow: { gap: 12 },

  listingCard: {
    width: 148,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  listingImageWrapper: { position: 'relative' },
  listingImage: { width: 148, height: 110 },
  listingImagePlaceholder: {
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#E53935',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
  listingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginHorizontal: 10,
  },
  listingVendor: { fontSize: 11, color: '#888', marginHorizontal: 10, marginTop: 2 },
  listingPrice: {
    fontSize: 12,
    color: '#C9A96E',
    fontWeight: '600',
    marginHorizontal: 10,
    marginTop: 4,
    marginBottom: 10,
  },
});
