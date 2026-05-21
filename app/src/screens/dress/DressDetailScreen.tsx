import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Modal,
  Share,
  Dimensions,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { getDressDetail, getSimilar } from '../../services/dress/dressService';
import { getBoutique } from '../../services/boutique/boutiqueService';
import { getStorageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/currency';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { BoutiqueDress } from '../../types/dress';
import type { Boutique } from '../../types/boutique';
import type { DiscoverStackParamList } from '../../types/navigation';

// Minimal navigation interface — compatible with DiscoverStack, ExploreStack, SavedStack
type Props = {
  navigation: {
    goBack: () => void;
    navigate(screen: 'DressDetailScreen', params: { boutiqueDressId: string }): void;
    navigate(screen: 'BoutiqueProfileScreen', params: { boutiqueId: string }): void;
    navigate(screen: 'TryOnScreen', params: { boutiqueDressId: string }): void;
  };
  route: RouteProp<DiscoverStackParamList, 'DressDetailScreen'>;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CAROUSEL_W = Math.min(SCREEN_W, 430);
const CAROUSEL_HEIGHT = CAROUSEL_W * (4 / 3);
const SIMILAR_CARD_W = (SCREEN_W - 48) / 2;

export default function DressDetailScreen({ route, navigation }: Props) {
  const { boutiqueDressId } = route.params;

  const [dress, setDress] = useState<BoutiqueDress | null>(null);
  const [similar, setSimilar] = useState<BoutiqueDress[]>([]);
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const modalCarouselRef = useRef<ScrollView>(null);

  useEffect(() => {
    async function load() {
      const [dressResult, similarResult] = await Promise.all([
        getDressDetail(boutiqueDressId),
        getSimilar(boutiqueDressId),
      ]);

      if (dressResult.error || !dressResult.data) {
        setErrorMessage(dressResult.error ?? t('dress_detail.not_found'));
        setLoading(false);
        return;
      }

      setDress(dressResult.data);
      setSimilar(similarResult.data ?? []);

      const boutiqueResult = await getBoutique(dressResult.data.boutique_id);
      if (boutiqueResult.data) setBoutique(boutiqueResult.data);

      setLoading(false);
    }
    load();
  }, [boutiqueDressId]);

  useEffect(() => {
    if (modalVisible && modalCarouselRef.current && activeIndex > 0) {
      modalCarouselRef.current.scrollTo({ x: activeIndex * SCREEN_W, animated: false });
    }
  }, [modalVisible]);

  async function handleShare() {
    if (!dress) return;
    try {
      await Share.share({ message: `${dress.dresses?.title ?? ''} — ${dress.boutiques?.name ?? ''} on Bridee` });
    } catch (err) {
      logger.error('DressDetailScreen: share failed', err);
    }
  }

  function handleTryOn() {
    navigation.navigate('TryOnScreen', { boutiqueDressId });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !dress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage ?? t('dress_detail.not_found')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const photos = [...(dress.dresses?.dress_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const d = dress.dresses;

  function renderInfoChip(label: string, value: string | null | undefined) {
    if (!value) return null;
    return (
      <View key={label} style={styles.infoChip}>
        <Text style={styles.infoChipLabel}>{label}</Text>
        <Text style={styles.infoChipValue}>{value}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Full-screen photo modal */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <ScrollView
            ref={modalCarouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={photos.length > 1}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
              setActiveIndex(idx);
            }}
            style={styles.modalScroll}
          >
            {photos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                activeOpacity={1}
                onPress={() => setModalVisible(false)}
                style={styles.modalPage}
              >
                <Image
                  source={{ uri: getStorageUrl('dress-photos', photo.path) }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {photos.length > 1 && (
            <View style={styles.dotsContainer}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]} />
              ))}
            </View>
          )}
          <SafeAreaView style={styles.modalClose}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <View style={styles.carouselContainer}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={photos.length > 1}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_W);
                setActiveIndex(idx);
              }}
              style={styles.carousel}
            >
              {photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  activeOpacity={0.95}
                  onPress={() => setModalVisible(true)}
                  style={styles.carouselPage}
                >
                  <Image
                    source={{ uri: getStorageUrl('dress-photos', photo.path) }}
                    style={styles.carouselImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.imagePlaceholder} />
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>

          {photos.length > 1 && (
            <View style={styles.dotsContainer}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]} />
              ))}
            </View>
          )}
        </View>

        {/* Detail content */}
        <View style={styles.details}>

          {/* Title + deal badge */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{d.title}</Text>
            {dress.deal_active && dress.deal_percent !== null && (
              <View style={styles.dealBadge}>
                <Text style={styles.dealText}>-{dress.deal_percent}%</Text>
              </View>
            )}
          </View>

          {/* Boutique + city */}
          <Text style={styles.boutiqueLine}>
            {dress.boutiques?.name ?? ''}{dress.boutiques?.city ? ` · ${dress.boutiques.city}` : ''}
          </Text>

          {d.subtitle ? <Text style={styles.subtitle}>{d.subtitle}</Text> : null}

          {/* Price section */}
          <View style={styles.priceSection}>
            {dress.price_sale !== null && (
              <View style={styles.priceRow}>
                <Text style={styles.salePrice}>{formatPrice(dress.price_sale, dress.price_currency)}</Text>
                {dress.price_original !== null && (
                  <Text style={styles.strikePrice}>{formatPrice(dress.price_original, dress.price_currency)}</Text>
                )}
                <Text style={styles.priceTag}>{t('dress_detail.buy')}</Text>
              </View>
            )}
            {dress.price_rental !== null && (
              <View style={styles.priceRow}>
                <Text style={styles.rentalPrice}>{formatPrice(dress.price_rental, dress.price_currency)}</Text>
                {dress.price_rental_original !== null && (
                  <Text style={styles.strikePrice}>{formatPrice(dress.price_rental_original, dress.price_currency)}</Text>
                )}
                <Text style={styles.priceTag}>{t('dress_detail.rental')}</Text>
              </View>
            )}
            {dress.price_range_min !== null && dress.price_range_max !== null && (
              <Text style={styles.priceRange}>
                {t('common.from')} {formatPrice(dress.price_range_min, dress.price_currency)} – {formatPrice(dress.price_range_max, dress.price_currency)}
              </Text>
            )}
          </View>

          {/* Info chips: SKU, availability, condition */}
          <View style={styles.infoChips}>
            {renderInfoChip(t('dress_detail.sku'), dress.sku)}
            {renderInfoChip(t('dress_detail.availability'), d.availability)}
            {renderInfoChip(t('dress_detail.condition'), d.condition)}
            {renderInfoChip(t('dress_detail.silhouette'), d.silhouette)}
            {renderInfoChip(t('dress_detail.designer'), d.designer)}
          </View>

          {/* Color */}
          {(d.color_name || d.color_code) ? (
            <View style={styles.section}>
              <Text style={styles.label}>{t('dress_detail.colour')}</Text>
              <View style={styles.colorRow}>
                {d.color_code ? (
                  <View style={[styles.colorSwatch, { backgroundColor: d.color_code }]} />
                ) : null}
                {d.color_name ? <Text style={styles.colorName}>{d.color_name}</Text> : null}
              </View>
            </View>
          ) : null}

          {/* Sizes */}
          {dress.available_sizes && dress.available_sizes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>{t('dress_detail.sizes')}</Text>
              <View style={styles.chipRow}>
                {dress.available_sizes.map((size) => (
                  <View key={size} style={styles.chip}>
                    <Text style={styles.chipText}>{size}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Style tags */}
          {d.style_tags && d.style_tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>{t('dress_detail.style_tags')}</Text>
              <View style={styles.chipRow}>
                {d.style_tags.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.chipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Fabric */}
          {d.fabric && d.fabric.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>{t('dress_detail.fabric')}</Text>
              <Text style={styles.bodyText}>{d.fabric.join(', ')}</Text>
            </View>
          )}

          {/* Long description */}
          {d.long_description ? (
            <View style={styles.section}>
              <Text style={styles.label}>{t('dress_detail.about')}</Text>
              <Text style={styles.description}>{d.long_description}</Text>
            </View>
          ) : null}

          {/* Additional services */}
          {d.additional_services && d.additional_services.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>{t('dress_detail.additional_services')}</Text>
              <View style={styles.chipRow}>
                {d.additional_services.map((svc) => (
                  <View key={svc} style={styles.tagChip}>
                    <Text style={styles.chipText}>{svc}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Social share row */}
          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.shareIcon} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="logo-tiktok" size={22} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareIcon} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="logo-instagram" size={22} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareIcon} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={22} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareIcon} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="logo-facebook" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          {/* CTA buttons */}
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.ctaSecondary} onPress={handleTryOn} activeOpacity={0.85}>
              <Ionicons name="sparkles-outline" size={18} color="#C9A96E" />
              <Text style={styles.ctaSecondaryText}>{t('dress_detail.virtual_try_on')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() => navigation.navigate('BoutiqueProfileScreen', { boutiqueId: dress.boutique_id })}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaPrimaryText}>{t('dress_detail.see_boutique')}</Text>
            </TouchableOpacity>
          </View>

          {/* Better Together — boutique services */}
          {boutique && (boutique.services ?? []).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>{t('dress_detail.better_together')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceList}>
                {(boutique.services ?? []).map((svc) => (
                  <View key={svc.id} style={styles.serviceCard}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#C9A96E" />
                    <Text style={styles.serviceText}>{svc.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Similar Styles */}
          {similar.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>{t('dress_detail.similar_styles')}</Text>
              <View style={styles.similarGrid}>
                {similar.slice(0, 6).map((item) => {
                  const coverPath = item.dresses?.dress_photos?.find((p) => p.sort_order === 0)?.path ?? null;
                  const imgUri = coverPath ? getStorageUrl('dress-photos', coverPath) : null;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.similarCard}
                      onPress={() => navigation.navigate('DressDetailScreen', { boutiqueDressId: item.id })}
                      activeOpacity={0.85}
                    >
                      {imgUri ? (
                        <Image source={{ uri: imgUri }} style={styles.similarImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.similarPlaceholder} />
                      )}
                      <View style={styles.similarInfo}>
                        <Text style={styles.similarTitle} numberOfLines={1}>{item.dresses?.title}</Text>
                        <Text style={styles.similarBoutique} numberOfLines={1}>{item.boutiques?.name}</Text>
                        {item.price_sale !== null && (
                          <Text style={styles.similarPrice}>{formatPrice(item.price_sale, item.price_currency)}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  backRow: {
    padding: 16,
  },

  // Carousel
  carouselContainer: {
    position: 'relative',
    width: CAROUSEL_W,
    height: CAROUSEL_HEIGHT,
  },
  carousel: {
    width: CAROUSEL_W,
    height: CAROUSEL_HEIGHT,
  },
  carouselPage: {
    width: CAROUSEL_W,
    height: CAROUSEL_HEIGHT,
  },
  carouselImage: {
    width: CAROUSEL_W,
    height: CAROUSEL_HEIGHT,
  },
  imagePlaceholder: {
    width: CAROUSEL_W,
    height: CAROUSEL_HEIGHT,
    backgroundColor: '#F0EDE8',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: { backgroundColor: '#C9A96E' },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.6)' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalScroll: { flex: 1 },
  modalPage: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: { width: SCREEN_W, height: SCREEN_H },
  modalClose: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 16,
  },

  // Detail
  details: { padding: 20 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },
  dealBadge: {
    backgroundColor: '#E53935',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  dealText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  boutiqueLine: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },

  // Prices
  priceSection: { marginBottom: 20 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  salePrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#C9A96E',
  },
  rentalPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5A8A6E',
  },
  strikePrice: {
    fontSize: 15,
    color: '#BBB',
    textDecorationLine: 'line-through',
  },
  priceTag: {
    fontSize: 12,
    color: '#999',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priceRange: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },

  // Info chips
  infoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  infoChip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  infoChipLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoChipValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    marginTop: 2,
  },

  // Sections
  section: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  colorName: { fontSize: 15, color: '#333' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  tagChip: {
    backgroundColor: '#F5F0EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 14, color: '#333', fontWeight: '500' },

  bodyText: { fontSize: 15, color: '#555' },
  description: { fontSize: 15, color: '#555', lineHeight: 24 },

  // Share row
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 16,
  },
  shareIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CTA buttons
  ctaRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  ctaSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#C9A96E',
    borderRadius: 12,
    paddingVertical: 14,
  },
  ctaSecondaryText: { fontSize: 14, fontWeight: '600', color: '#C9A96E' },
  ctaPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    paddingVertical: 14,
  },
  ctaPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Better Together
  serviceList: { paddingBottom: 4, gap: 10 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  serviceText: { fontSize: 13, color: '#333', fontWeight: '500' },

  // Similar Styles
  similarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  similarCard: {
    width: SIMILAR_CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  similarImage: {
    width: '100%',
    height: SIMILAR_CARD_W * 1.3,
  },
  similarPlaceholder: {
    width: '100%',
    height: SIMILAR_CARD_W * 1.3,
    backgroundColor: '#F0EDE8',
  },
  similarInfo: { padding: 10 },
  similarTitle: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 2 },
  similarBoutique: { fontSize: 11, color: '#999', marginBottom: 3 },
  similarPrice: { fontSize: 13, fontWeight: '700', color: '#C9A96E' },

  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center' },
});
