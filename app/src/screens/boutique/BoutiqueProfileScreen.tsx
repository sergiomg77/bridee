import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getBoutique, getBoutiqueCollection, getBoutiqueReviews, saveBoutique, unsaveBoutique } from '../../services/boutique/boutiqueService';
import { startConversation } from '../../services/conversation/conversationService';
import { getStorageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/currency';
import { navigationRef } from '../../navigation/navigationRef';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { Boutique, BoutiqueReview } from '../../types/boutique';
import type { BoutiqueDress } from '../../types/dress';

type Tab = 'collection' | 'about' | 'reviews';

type Props = {
  navigation: {
    goBack(): void;
    navigate(screen: 'DressDetailScreen', params: { boutiqueDressId: string }): void;
    navigate(screen: 'BookAppointmentScreen', params: { boutiqueId: string; boutiqueDressId?: string }): void;
  };
  route: { params: { boutiqueId: string } };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_W = Math.min(SCREEN_WIDTH, 430);
const COVER_H = MAX_W * 0.55;
const DRESS_CARD_W = (MAX_W - 48) / 2;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BoutiqueProfileScreen({ route, navigation }: Props) {
  const { boutiqueId } = route.params;

  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [collection, setCollection] = useState<BoutiqueDress[]>([]);
  const [reviews, setReviews] = useState<BoutiqueReview[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('collection');
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savingState, setSavingState] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setErrorMessage(null);

    const [boutiqueResult, collectionResult, reviewsResult] = await Promise.all([
      getBoutique(boutiqueId),
      getBoutiqueCollection(boutiqueId),
      getBoutiqueReviews(boutiqueId),
    ]);

    if (boutiqueResult.error || !boutiqueResult.data) {
      logger.error('BoutiqueProfileScreen: getBoutique failed', { error: boutiqueResult.error });
      setErrorMessage(boutiqueResult.error ?? t('common.error'));
      setLoading(false);
      return;
    }

    setBoutique(boutiqueResult.data);
    setCollection(collectionResult.data ?? []);
    setReviews(reviewsResult.data ?? []);
    setLoading(false);
  }

  async function handleChat() {
    if (startingChat) return;
    setStartingChat(true);
    const { data, error } = await startConversation({ boutique_id: boutiqueId });
    setStartingChat(false);
    if (error || !data) {
      logger.error('BoutiqueProfileScreen: startConversation failed', { error });
      return;
    }
    if (navigationRef.isReady()) {
      navigationRef.navigate('MessagesStack', {
        screen: 'ConversationScreen',
        params: { conversationId: data.id, participantName: data.participant_name },
      });
    }
  }

  async function handleSaveToggle() {
    if (!boutique || savingState) return;
    setSavingState(true);
    if (isSaved) {
      await unsaveBoutique(boutiqueId);
      setIsSaved(false);
    } else {
      await saveBoutique(boutiqueId);
      setIsSaved(true);
    }
    setSavingState(false);
  }

  function renderStars(rating: number) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={12}
          color="#F0A500"
        />
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  }

  function renderCollectionTab() {
    if (collection.length === 0) {
      return (
        <View style={styles.tabEmpty}>
          <Text style={styles.tabEmptyText}>{t('boutique.no_dresses')}</Text>
        </View>
      );
    }
    return (
      <View style={styles.dressGrid}>
        {collection.map((item) => {
          const coverPath = item.dresses?.dress_photos?.find((p) => p.sort_order === 0)?.path ?? null;
          const imgUri = coverPath ? getStorageUrl('dress-photos', coverPath) : null;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.dressCard}
              onPress={() => navigation.navigate('DressDetailScreen', { boutiqueDressId: item.id })}
              activeOpacity={0.85}
            >
              {imgUri ? (
                <Image source={{ uri: imgUri }} style={styles.dressImage} resizeMode="cover" />
              ) : (
                <View style={styles.dressImagePlaceholder} />
              )}
              <View style={styles.dressInfo}>
                <Text style={styles.dressTitle} numberOfLines={1}>{item.dresses?.title}</Text>
                {item.price_sale !== null && (
                  <Text style={styles.dressPrice}>
                    {formatPrice(item.price_sale, item.price_currency)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderAboutTab() {
    if (!boutique) return null;
    return (
      <View style={styles.aboutSection}>
        {boutique.about ? (
          <View style={styles.aboutBlock}>
            <Text style={styles.aboutBody}>{boutique.about}</Text>
          </View>
        ) : null}

        {boutique.address || boutique.city ? (
          <View style={styles.aboutRow}>
            <Ionicons name="location-outline" size={16} color="#C9A96E" />
            <Text style={styles.aboutText}>
              {[boutique.address, boutique.city, boutique.country].filter(Boolean).join(', ')}
            </Text>
          </View>
        ) : null}

        {boutique.phone ? (
          <View style={styles.aboutRow}>
            <Ionicons name="call-outline" size={16} color="#C9A96E" />
            <Text style={styles.aboutText}>{boutique.phone}</Text>
          </View>
        ) : null}

        {boutique.email ? (
          <View style={styles.aboutRow}>
            <Ionicons name="mail-outline" size={16} color="#C9A96E" />
            <Text style={styles.aboutText}>{boutique.email}</Text>
          </View>
        ) : null}

        {boutique.website ? (
          <View style={styles.aboutRow}>
            <Ionicons name="globe-outline" size={16} color="#C9A96E" />
            <Text style={styles.aboutText}>{boutique.website}</Text>
          </View>
        ) : null}

        {/* Social links */}
        <View style={styles.socialRow}>
          {boutique.instagram ? (
            <View style={styles.socialChip}>
              <Ionicons name="logo-instagram" size={16} color="#C9A96E" />
              <Text style={styles.socialText}>{boutique.instagram}</Text>
            </View>
          ) : null}
          {boutique.facebook ? (
            <View style={styles.socialChip}>
              <Ionicons name="logo-facebook" size={16} color="#3B5998" />
              <Text style={styles.socialText}>{boutique.facebook}</Text>
            </View>
          ) : null}
          {boutique.tiktok ? (
            <View style={styles.socialChip}>
              <Ionicons name="logo-tiktok" size={16} color="#333" />
              <Text style={styles.socialText}>{boutique.tiktok}</Text>
            </View>
          ) : null}
        </View>

        {/* Opening hours */}
        {boutique.opening_hours.length > 0 ? (
          <View style={styles.hoursBlock}>
            <Text style={styles.hoursTitle}>{t('boutique.opening_hours')}</Text>
            {boutique.opening_hours
              .sort((a, b) => a.day_of_week - b.day_of_week)
              .map((h) => (
                <View key={h.id} style={styles.hoursRow}>
                  <Text style={styles.dayText}>{DAY_NAMES[h.day_of_week]}</Text>
                  <Text style={styles.timeText}>
                    {h.is_closed
                      ? t('boutique.closed')
                      : h.open_time && h.close_time
                      ? `${h.open_time} – ${h.close_time}`
                      : t('boutique.no_hours')}
                  </Text>
                </View>
              ))}
          </View>
        ) : null}

        {/* Services */}
        {boutique.services.length > 0 ? (
          <View style={styles.servicesBlock}>
            <Text style={styles.hoursTitle}>{t('boutique.services')}</Text>
            {boutique.services.map((s) => (
              <View key={s.id} style={styles.serviceRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#C9A96E" />
                <Text style={styles.serviceText}>{s.name}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  function renderReviewsTab() {
    if (reviews.length === 0) {
      return (
        <View style={styles.tabEmpty}>
          <Text style={styles.tabEmptyText}>{t('boutique.no_reviews')}</Text>
        </View>
      );
    }
    return (
      <View style={styles.reviewsList}>
        {reviews.map((r) => (
          <View key={r.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              {renderStars(r.rating)}
              <Text style={styles.reviewDate}>
                {new Date(r.created_at).toLocaleDateString()}
              </Text>
            </View>
            {r.review_text ? (
              <Text style={styles.reviewText}>{r.review_text}</Text>
            ) : null}
            {r.reviewer_role ? (
              <Text style={styles.reviewRole}>{r.reviewer_role}</Text>
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('boutique.profile_title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !boutique) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('boutique.profile_title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage ?? t('common.error')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const coverPhoto = boutique.cover_photos.sort((a, b) => a.sort_order - b.sort_order)[0];
  const coverUri = coverPhoto ? getStorageUrl('dress-photos', coverPhoto.path) : null;
  const logoUri = boutique.logo_path ? getStorageUrl('boutique-logos', boutique.logo_path) : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'collection', label: t('boutique.collection') },
    { key: 'about', label: t('boutique.about') },
    { key: 'reviews', label: t('boutique.reviews') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* Cover + identity */}
        <View>
          {/* Cover photo */}
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder} />
          )}

          {/* Back button overlay */}
          <TouchableOpacity style={styles.backOverlay} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* Identity row */}
          <View style={styles.identityRow}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="cover" />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="storefront-outline" size={24} color="#C9A96E" />
              </View>
            )}
            <View style={styles.identityInfo}>
              <Text style={styles.boutiqueName}>{boutique.name}</Text>
              {boutique.city ? (
                <Text style={styles.boutiqueCity}>{boutique.city}</Text>
              ) : null}
              {boutique.specialty_tags && boutique.specialty_tags.length > 0 ? (
                <Text style={styles.specialtyTags} numberOfLines={1}>
                  {boutique.specialty_tags.join(' · ')}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.saveButton, isSaved && styles.saveButtonActive]}
              onPress={handleSaveToggle}
              disabled={savingState}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={20}
                color={isSaved ? '#FFFFFF' : '#C9A96E'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab bar (sticky) */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 'collection' && renderCollectionTab()}
          {activeTab === 'about' && renderAboutTab()}
          {activeTab === 'reviews' && renderReviewsTab()}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer CTAs */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleChat}
            disabled={startingChat}
            activeOpacity={0.85}
          >
            {startingChat ? (
              <ActivityIndicator size="small" color="#C9A96E" />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={18} color="#C9A96E" />
                <Text style={styles.chatButtonText}>{t('messages.chat')}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => navigation.navigate('BookAppointmentScreen', { boutiqueId })}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
            <Text style={styles.bookButtonText}>{t('boutique.book_appointment')}</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#333' },
  headerSpacer: { width: 40 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center' },

  // Cover
  coverImage: { width: '100%', height: COVER_H },
  coverPlaceholder: { width: '100%', height: COVER_H, backgroundColor: '#F0EDE8' },
  backOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },

  // Identity row
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  logo: { width: 52, height: 52, borderRadius: 26 },
  logoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5EDE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: { flex: 1 },
  boutiqueName: { fontSize: 17, fontWeight: '700', color: '#333' },
  boutiqueCity: { fontSize: 13, color: '#888', marginTop: 1 },
  specialtyTags: { fontSize: 11, color: '#C9A96E', marginTop: 3, fontWeight: '500' },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#C9A96E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonActive: { backgroundColor: '#C9A96E', borderColor: '#C9A96E' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: '#C9A96E' },
  tabLabel: { fontSize: 13, fontWeight: '500', color: '#999' },
  tabLabelActive: { color: '#C9A96E', fontWeight: '700' },

  tabContent: { paddingVertical: 16 },
  tabEmpty: { alignItems: 'center', padding: 40 },
  tabEmptyText: { fontSize: 15, color: '#999' },

  // Collection
  dressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  dressCard: {
    width: DRESS_CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  dressImage: { width: DRESS_CARD_W, height: DRESS_CARD_W * 1.3 },
  dressImagePlaceholder: { width: DRESS_CARD_W, height: DRESS_CARD_W * 1.3, backgroundColor: '#F0EDE8' },
  dressInfo: { padding: 10 },
  dressTitle: { fontSize: 13, fontWeight: '600', color: '#333' },
  dressPrice: { fontSize: 12, fontWeight: '700', color: '#C9A96E', marginTop: 3 },

  // About
  aboutSection: { paddingHorizontal: 20, gap: 16 },
  aboutBlock: { marginBottom: 8 },
  aboutBody: { fontSize: 15, color: '#555', lineHeight: 24 },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  aboutText: { flex: 1, fontSize: 14, color: '#444', lineHeight: 22 },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  socialText: { fontSize: 12, color: '#333' },

  hoursBlock: { marginTop: 8 },
  hoursTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  dayText: { fontSize: 13, fontWeight: '600', color: '#333', width: 40 },
  timeText: { fontSize: 13, color: '#666' },

  servicesBlock: { marginTop: 8 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  serviceText: { fontSize: 14, color: '#333' },

  // Reviews
  reviewsList: { paddingHorizontal: 16, gap: 12 },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontSize: 11, color: '#BBB' },
  reviewText: { fontSize: 14, color: '#444', lineHeight: 22 },
  reviewRole: { fontSize: 12, color: '#C9A96E', fontWeight: '500' },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  footerRow: { flexDirection: 'row', gap: 12 },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#C9A96E',
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 52,
  },
  chatButtonText: { fontSize: 15, fontWeight: '600', color: '#C9A96E' },
  bookButton: {
    flex: 2,
    backgroundColor: '#C9A96E',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bookButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
