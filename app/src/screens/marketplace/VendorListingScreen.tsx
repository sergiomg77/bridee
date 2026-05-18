import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import {
  getListingDetail,
  getCategories,
  getSavedListings,
  saveListing,
  unsaveListing,
} from '../../services/marketplace/marketplaceService';
import { startConversation } from '../../services/conversation/conversationService';
import { getStorageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/currency';
import { navigationRef } from '../../navigation/navigationRef';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type {
  FilterConfig,
  VendorListing,
  VendorListingPhoto,
  VendorPackage,
} from '../../types/marketplace';
import type { MarketplaceStackParamList } from '../../types/navigation';

type Props = StackScreenProps<MarketplaceStackParamList, 'VendorListingScreen'>;

export default function VendorListingScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const { width: windowWidth } = useWindowDimensions();
  const photoWidth = Math.min(windowWidth, 430);

  const [listing, setListing] = useState<VendorListing | null>(null);
  const [filterConfig, setFilterConfig] = useState<FilterConfig | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    load();
  }, [listingId]);

  async function load() {
    setLoading(true);
    setError(null);

    const [detailResult, catsResult, savedResult] = await Promise.all([
      getListingDetail(listingId),
      getCategories(),
      getSavedListings(),
    ]);

    if (detailResult.error || !detailResult.data) {
      logger.error('VendorListingScreen: getListingDetail failed', { error: detailResult.error });
      setError(detailResult.error ?? t('common.error'));
      setLoading(false);
      return;
    }

    const detail = detailResult.data;
    setListing(detail);

    if (catsResult.data) {
      const cat = catsResult.data.find(c => c.id === detail.category_id);
      setFilterConfig(cat?.filter_config ?? null);
    }

    if (savedResult.data) {
      setIsSaved(savedResult.data.some(s => s.listing_id === listingId));
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!listing) return;
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    const { error: err } = wasSaved
      ? await unsaveListing(listing.id)
      : await saveListing(listing.id);
    if (err) {
      logger.error('VendorListingScreen: save failed', { error: err });
      setIsSaved(wasSaved);
    }
  }

  async function handleInquire() {
    if (!listing || startingChat) return;
    setStartingChat(true);
    const { data, error: err } = await startConversation({ vendor_id: listing.vendor_id });
    if (err || !data) {
      logger.error('VendorListingScreen: startConversation failed', { error: err });
      setStartingChat(false);
      return;
    }
    setStartingChat(false);
    navigationRef.navigate('MessagesStack', {
      screen: 'ConversationScreen',
      params: { conversationId: data.id, participantName: data.participant_name },
    });
  }

  function formatPackagePrice(pkg: VendorPackage): string {
    if (pkg.pricing_model === 'quote' || pkg.price === null) return t('marketplace.contact_for_quote');
    const price = formatPrice(pkg.price, pkg.price_currency);
    if (pkg.pricing_model === 'per_hour') return price + t('marketplace.per_hour');
    return price;
  }

  function getAttributeLabel(key: string): string {
    if (!filterConfig) return key;
    const field = filterConfig.filters.find(f => f.key === key);
    return field?.label ?? key;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.simpleHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? t('common.error')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sortedPhotos = [...listing.photos].sort((a, b) => a.sort_order - b.sort_order);
  const activePackages = listing.packages
    .filter(p => p.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const attributeEntries = Object.entries(listing.attributes).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );

  function renderPhoto({ item }: { item: VendorListingPhoto }) {
    return (
      <Image
        source={{ uri: getStorageUrl('vendor-photos', item.path) }}
        style={{ width: photoWidth, height: 280 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Photo gallery */}
        <View style={{ position: 'relative' }}>
          {sortedPhotos.length > 0 ? (
            <FlatList
              data={sortedPhotos}
              keyExtractor={(item) => item.id}
              renderItem={renderPhoto}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ width: photoWidth, height: 280 }}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
                );
                setActivePhotoIndex(index);
              }}
            />
          ) : (
            <View style={[styles.photoPlaceholder, { width: photoWidth }]}>
              <Ionicons name="image-outline" size={48} color="#DDD" />
            </View>
          )}

          {sortedPhotos.length > 1 && (
            <View style={styles.dotRow}>
              {sortedPhotos.map((_, i) => (
                <View key={i} style={[styles.dot, i === activePhotoIndex && styles.dotActive]} />
              ))}
            </View>
          )}

          <View style={styles.photoOverlay}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.overlayButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.overlayButton} activeOpacity={0.7}>
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={22}
                color={isSaved ? '#E53935' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Vendor info */}
          <View style={styles.infoSection}>
            <Text style={styles.title}>{listing.title}</Text>
            <Text style={styles.vendorName}>{listing.vendor_name}</Text>
            {listing.city && (
              <View style={styles.cityRow}>
                <Ionicons name="location-outline" size={14} color="#888" />
                <Text style={styles.city}>{listing.city}</Text>
              </View>
            )}
            {listing.avg_rating != null && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F5A623" />
                <Text style={styles.rating}>{listing.avg_rating.toFixed(1)}</Text>
                {listing.review_count != null && (
                  <Text style={styles.reviewCount}>
                    ({listing.review_count} {t('marketplace.reviews_summary')})
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Description */}
          {listing.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionBody}>{listing.description}</Text>
            </View>
          ) : null}

          {/* Packages */}
          {activePackages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('marketplace.packages')}</Text>
              {activePackages.map(pkg => (
                <View key={pkg.id} style={styles.packageCard}>
                  <View style={styles.packageHeader}>
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packagePrice}>{formatPackagePrice(pkg)}</Text>
                  </View>
                  {pkg.description ? (
                    <Text style={styles.packageDescription}>{pkg.description}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Attributes */}
          {attributeEntries.length > 0 && filterConfig && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('marketplace.attributes')}</Text>
              {attributeEntries.map(([key, value]) => (
                <View key={key} style={styles.attributeRow}>
                  <Text style={styles.attributeLabel}>{getAttributeLabel(key)}</Text>
                  <Text style={styles.attributeValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Inquire CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.inquireButton, startingChat && styles.inquireButtonDisabled]}
          onPress={handleInquire}
          disabled={startingChat}
          activeOpacity={0.85}
        >
          {startingChat ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.inquireButtonText}>{t('marketplace.inquire')}</Text>
          )}
        </TouchableOpacity>
      </View>
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
  scroll: { paddingBottom: 100 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center' },
  retryButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  simpleHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  photoPlaceholder: {
    height: 280,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  overlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: '#FFFFFF', width: 18 },

  content: { paddingHorizontal: 20, paddingTop: 20 },

  infoSection: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 4 },
  vendorName: { fontSize: 15, color: '#888', marginBottom: 6 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  city: { fontSize: 14, color: '#888' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 14, fontWeight: '600', color: '#333' },
  reviewCount: { fontSize: 13, color: '#888' },

  section: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 20,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 14 },
  sectionBody: { fontSize: 14, color: '#555', lineHeight: 22 },

  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  packageName: { fontSize: 15, fontWeight: '600', color: '#333', flex: 1, marginRight: 12 },
  packagePrice: { fontSize: 15, fontWeight: '700', color: '#C9A96E' },
  packageDescription: { fontSize: 13, color: '#777', lineHeight: 20 },

  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  attributeLabel: { fontSize: 14, color: '#888', flex: 1 },
  attributeValue: { fontSize: 14, color: '#333', fontWeight: '500', textAlign: 'right', flex: 1 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  inquireButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  inquireButtonDisabled: { opacity: 0.5 },
  inquireButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
