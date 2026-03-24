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
  Dimensions,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { fetchDressById } from '../../services/dress/dressService';
import { DressPhoto, DressWithBoutiqueDetails } from '../../types/dress';
import { SavedStackParamList } from '../../types/navigation';
import { getDressPhotoUrl } from '../../lib/supabase';

type Props = StackScreenProps<SavedStackParamList, 'DressDetailScreen'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CAROUSEL_W = Math.min(SCREEN_W, 430);
const CAROUSEL_HEIGHT = CAROUSEL_W * (4 / 3);

export default function DressDetailScreen({ route, navigation }: Props) {
  const { dressId } = route.params;

  const [dress, setDress] = useState<DressWithBoutiqueDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const modalCarouselRef = useRef<ScrollView>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchDressById(dressId);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setDress(data);
      }
      setLoading(false);
    }
    load();
  }, [dressId]);

  // Scroll modal carousel to the active photo when modal opens
  useEffect(() => {
    if (modalVisible && modalCarouselRef.current && activeIndex > 0) {
      modalCarouselRef.current.scrollTo({ x: activeIndex * SCREEN_W, animated: false });
    }
  }, [modalVisible]);

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
          <Text style={styles.errorText}>{errorMessage ?? 'Dress not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const photos: DressPhoto[] = [...dress.dress_photos].sort((a, b) => a.sort_order - b.sort_order);
  const activeBoutiques = dress.boutique_dresses.filter((b) => b.is_active);
  const prices = activeBoutiques.map((b) => b.price).filter((p): p is number => p !== null);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const allSizes = [...new Set(activeBoutiques.flatMap((b) => b.available_sizes ?? []))].sort();

  const hasTryOn = dress.dress_photos.some((p) => p.is_tryon_eligible);

  function handleCarouselScroll(x: number) {
    const idx = Math.round(x / CAROUSEL_W);
    if (idx !== activeIndex) setActiveIndex(idx);
  }

  function handleModalScroll(x: number) {
    const idx = Math.round(x / SCREEN_W);
    if (idx !== activeIndex) setActiveIndex(idx);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Full-screen photo modal ── */}
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
            onMomentumScrollEnd={(e) => handleModalScroll(e.nativeEvent.contentOffset.x)}
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
                  source={{ uri: getDressPhotoUrl(photo.path) }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Dot indicators */}
          {photos.length > 1 && (
            <View style={styles.dotsContainer}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* ── Main scrollable content ── */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <View style={styles.carouselContainer}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={photos.length > 1}
              onMomentumScrollEnd={(e) => handleCarouselScroll(e.nativeEvent.contentOffset.x)}
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
                    source={{ uri: getDressPhotoUrl(photo.path) }}
                    style={styles.carouselImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.imagePlaceholder} />
          )}

          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* Dot indicators */}
          {photos.length > 1 && (
            <View style={styles.dotsContainer}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Detail content ── */}
        <View style={styles.details}>
          {/* Title, badge & subtitle */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{dress.title}</Text>
            {hasTryOn && (
              <TouchableOpacity
                style={styles.tryOnBadge}
                onPress={() => {
                  const tryOnPhoto = dress.dress_photos.find((p) => p.is_tryon_eligible);
                  if (tryOnPhoto) {
                    navigation.navigate('TryOnInstructionScreen', {
                      dressId: dress.id,
                      tryOnPhotoPath: tryOnPhoto.path,
                    });
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.tryOnText}>Try it on</Text>
              </TouchableOpacity>
            )}
          </View>
          {dress.subtitle ? <Text style={styles.subtitle}>{dress.subtitle}</Text> : null}

          {/* Price */}
          {minPrice !== null && (
            <Text style={styles.price}>From £{minPrice.toLocaleString()}</Text>
          )}

          {/* Color */}
          {(dress.color_name || dress.color_code) ? (
            <View style={styles.row}>
              <Text style={styles.label}>Colour</Text>
              <View style={styles.colorRow}>
                {dress.color_code ? (
                  <View style={[styles.colorSwatch, { backgroundColor: dress.color_code }]} />
                ) : null}
                {dress.color_name ? (
                  <Text style={styles.colorName}>{dress.color_name}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Sizes */}
          {allSizes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Available Sizes</Text>
              <View style={styles.sizeRow}>
                {allSizes.map((size) => (
                  <View key={size} style={styles.sizeChip}>
                    <Text style={styles.sizeText}>{size}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Boutiques */}
          {activeBoutiques.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Available At</Text>
              {activeBoutiques.map((b) => (
                <View key={b.id} style={styles.boutiqueRow}>
                  <Text style={styles.boutiqueName}>{b.boutiques?.name ?? 'Boutique'}</Text>
                  {b.price !== null ? (
                    <Text style={styles.boutiquePrice}>£{b.price.toLocaleString()}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Description */}
          {dress.long_description ? (
            <View style={styles.section}>
              <Text style={styles.label}>About this dress</Text>
              <Text style={styles.description}>{dress.long_description}</Text>
            </View>
          ) : null}
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

  // ── Carousel ──────────────────────────────────────────────────────────────
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

  // ── Back button ───────────────────────────────────────────────────────────
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

  // ── Try-On badge ──────────────────────────────────────────────────────────
  tryOnBadge: {
    backgroundColor: '#C9A96E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'center',
  },
  tryOnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Dot indicators ────────────────────────────────────────────────────────
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
  dotActive: {
    backgroundColor: '#C9A96E',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  // ── Full-screen modal ─────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalScroll: {
    flex: 1,
  },
  modalPage: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },

  // ── Detail content ────────────────────────────────────────────────────────
  details: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C9A96E',
    marginBottom: 20,
  },
  row: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  colorSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  colorName: {
    fontSize: 15,
    color: '#333',
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeChip: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  sizeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  boutiqueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  boutiqueName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  boutiquePrice: {
    fontSize: 15,
    color: '#C9A96E',
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#CC3333',
    textAlign: 'center',
  },
});
