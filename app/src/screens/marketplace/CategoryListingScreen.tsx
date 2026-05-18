import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import {
  getCategories,
  getListings,
  getSavedListings,
  saveListing,
  unsaveListing,
} from '../../services/marketplace/marketplaceService';
import { getStorageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/currency';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { FilterConfig, VendorListing } from '../../types/marketplace';
import type { MarketplaceStackParamList } from '../../types/navigation';

type Props = StackScreenProps<MarketplaceStackParamList, 'CategoryListingScreen'>;

const SORT_KEYS = ['recommended', 'popular', 'newest', 'price_asc'] as const;
type SortKey = typeof SORT_KEYS[number];

function getSortLabel(key: SortKey): string {
  switch (key) {
    case 'recommended': return t('marketplace.sort_recommended');
    case 'popular': return t('marketplace.sort_popular');
    case 'newest': return t('marketplace.sort_newest');
    case 'price_asc': return t('marketplace.sort_price_asc');
  }
}

function applySort(listings: VendorListing[], sort: SortKey): VendorListing[] {
  const copy = [...listings];
  if (sort === 'popular') {
    return copy.sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0));
  }
  if (sort === 'newest') {
    return copy.sort((a, b) => (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0));
  }
  if (sort === 'price_asc') {
    const getMinPrice = (l: VendorListing) => {
      const pkg = l.packages
        .filter(p => p.is_active && p.price !== null)
        .sort((a, b) => a.sort_order - b.sort_order)[0];
      return pkg?.price ?? Infinity;
    };
    return copy.sort((a, b) => getMinPrice(a) - getMinPrice(b));
  }
  return copy;
}

export default function CategoryListingScreen({ route, navigation }: Props) {
  const { categoryId, categoryName } = route.params;

  const [listings, setListings] = useState<VendorListing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [filterConfig, setFilterConfig] = useState<FilterConfig | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string | boolean>>({});
  const [sort, setSort] = useState<SortKey>('recommended');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [quickViewListing, setQuickViewListing] = useState<VendorListing | null>(null);

  useEffect(() => {
    loadInitial();
  }, [categoryId]);

  async function loadInitial() {
    setLoading(true);
    setError(null);
    setActiveFilters({});

    const [catsResult, listingsResult, savedResult] = await Promise.all([
      getCategories(),
      getListings(categoryId),
      getSavedListings(),
    ]);

    if (catsResult.data) {
      const cat = catsResult.data.find(c => c.id === categoryId);
      setFilterConfig(cat?.filter_config ?? null);
    }

    if (listingsResult.error) {
      logger.error('CategoryListingScreen: getListings failed', { error: listingsResult.error });
      setError(listingsResult.error);
    } else {
      setListings(listingsResult.data ?? []);
    }

    if (savedResult.data) {
      setSavedIds(new Set(savedResult.data.map(s => s.listing_id)));
    }

    setLoading(false);
  }

  async function fetchListings(filters: Record<string, string | boolean>) {
    const { data, error: err } = await getListings(categoryId, filters);
    if (err) {
      logger.error('CategoryListingScreen: getListings (filter) failed', { error: err });
    } else {
      setListings(data ?? []);
    }
  }

  function handleToggleFilter(key: string, value: string | boolean) {
    const prev = activeFilters;
    let next: Record<string, string | boolean>;

    if (typeof value === 'boolean') {
      next = { ...prev, [key]: !prev[key] };
    } else if (prev[key] === value) {
      const copy = { ...prev };
      delete copy[key];
      next = copy;
    } else {
      next = { ...prev, [key]: value };
    }

    setActiveFilters(next);
    fetchListings(next);
  }

  async function handleSave(listing: VendorListing) {
    const wasSaved = savedIds.has(listing.id);
    setSavedIds(prev => {
      const next = new Set(prev);
      wasSaved ? next.delete(listing.id) : next.add(listing.id);
      return next;
    });

    const { error: err } = wasSaved
      ? await unsaveListing(listing.id)
      : await saveListing(listing.id);

    if (err) {
      logger.error('CategoryListingScreen: save/unsave failed', { error: err });
      setSavedIds(prev => {
        const next = new Set(prev);
        wasSaved ? next.add(listing.id) : next.delete(listing.id);
        return next;
      });
    }
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

  function renderFilterChips() {
    if (!filterConfig || !filterConfig.filters.length) return null;

    const chips: React.ReactNode[] = [];

    for (const field of filterConfig.filters) {
      if (field.type === 'boolean') {
        const isActive = !!activeFilters[field.key];
        chips.push(
          <TouchableOpacity
            key={field.key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => handleToggleFilter(field.key, true)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {field.label}
            </Text>
          </TouchableOpacity>
        );
      } else if (field.options) {
        for (const option of field.options) {
          const isActive = activeFilters[field.key] === option;
          chips.push(
            <TouchableOpacity
              key={`${field.key}-${option}`}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => handleToggleFilter(field.key, option)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        }
      }
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {chips}
      </ScrollView>
    );
  }

  const sorted = applySort(listings, sort);

  function renderListingCard({ item }: { item: VendorListing }) {
    const photoUrl = getCoverPhotoUrl(item);
    const price = getDisplayPrice(item);
    const isSaved = savedIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setQuickViewListing(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardImageWrapper}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Ionicons name="image-outline" size={32} color="#DDD" />
            </View>
          )}
          {item.is_new && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>{t('marketplace.new_badge')}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.cardSaveButton}
            onPress={() => handleSave(item)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={18}
              color={isSaved ? '#E53935' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardVendor} numberOfLines={1}>{item.vendor_name}</Text>
          {item.city ? <Text style={styles.cardCity} numberOfLines={1}>{item.city}</Text> : null}
          {price ? <Text style={styles.cardPrice}>{price}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  }

  const quickCoverUrl = quickViewListing ? getCoverPhotoUrl(quickViewListing) : null;
  const quickPrice = quickViewListing ? getDisplayPrice(quickViewListing) : '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {renderFilterChips()}

      <View style={styles.sortBar}>
        <Text style={styles.resultCount}>{sorted.length} {t('marketplace.results')}</Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortModalVisible(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="swap-vertical-outline" size={16} color="#C9A96E" />
          <Text style={styles.sortLabel}>{getSortLabel(sort)}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInitial}>
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={renderListingCard}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t('marketplace.no_listings')}</Text>
            </View>
          }
        />
      )}

      {/* Sort modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.sortSheet}>
            <Text style={styles.sortSheetTitle}>{t('marketplace.sort')}</Text>
            {SORT_KEYS.map(key => (
              <TouchableOpacity
                key={key}
                style={styles.sortOption}
                onPress={() => { setSort(key); setSortModalVisible(false); }}
                activeOpacity={0.75}
              >
                <Text style={[styles.sortOptionText, sort === key && styles.sortOptionActive]}>
                  {getSortLabel(key)}
                </Text>
                {sort === key && <Ionicons name="checkmark" size={18} color="#C9A96E" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Quick view modal */}
      <Modal
        visible={quickViewListing !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickViewListing(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setQuickViewListing(null)}
        >
          <View style={styles.quickViewSheet}>
            {quickCoverUrl ? (
              <Image
                source={{ uri: quickCoverUrl }}
                style={styles.quickViewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.quickViewImage, styles.cardImagePlaceholder]}>
                <Ionicons name="image-outline" size={40} color="#DDD" />
              </View>
            )}
            <View style={styles.quickViewBody}>
              <Text style={styles.quickViewTitle}>{quickViewListing?.title}</Text>
              <Text style={styles.quickViewVendor}>{quickViewListing?.vendor_name}</Text>
              {quickViewListing?.city ? (
                <Text style={styles.quickViewCity}>{quickViewListing.city}</Text>
              ) : null}
              {quickPrice ? <Text style={styles.quickViewPrice}>{quickPrice}</Text> : null}
              <TouchableOpacity
                style={styles.viewFullButton}
                onPress={() => {
                  if (!quickViewListing) return;
                  setQuickViewListing(null);
                  navigation.navigate('VendorListingScreen', { listingId: quickViewListing.id });
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.viewFullButtonText}>{t('marketplace.view_listing')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center' },
  retryButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyText: { fontSize: 15, color: '#999', textAlign: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#333' },
  headerSpacer: { width: 40 },

  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipActive: { backgroundColor: '#C9A96E', borderColor: '#C9A96E' },
  chipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },

  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  resultCount: { fontSize: 13, color: '#888' },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortLabel: { fontSize: 13, color: '#C9A96E', fontWeight: '600' },

  list: { paddingHorizontal: 12, paddingVertical: 12, paddingBottom: 32 },
  row: { gap: 12, marginBottom: 12 },

  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  cardImageWrapper: { position: 'relative' },
  cardImage: { width: '100%', aspectRatio: 4 / 3 },
  cardImagePlaceholder: {
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
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
  cardSaveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 2 },
  cardVendor: { fontSize: 11, color: '#888' },
  cardCity: { fontSize: 11, color: '#AAA' },
  cardPrice: { fontSize: 13, color: '#C9A96E', fontWeight: '600', marginTop: 6 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sortSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 4,
  },
  sortSheetTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  sortOptionText: { fontSize: 15, color: '#555' },
  sortOptionActive: { color: '#C9A96E', fontWeight: '600' },

  quickViewSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  quickViewImage: { width: '100%', height: 200 },
  quickViewBody: { padding: 20, gap: 4 },
  quickViewTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  quickViewVendor: { fontSize: 14, color: '#888' },
  quickViewCity: { fontSize: 13, color: '#AAA' },
  quickViewPrice: { fontSize: 16, color: '#C9A96E', fontWeight: '700', marginTop: 8 },
  viewFullButton: {
    marginTop: 16,
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewFullButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
