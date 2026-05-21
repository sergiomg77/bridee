import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { getSavedBoutiques, unsaveBoutique } from '../../services/boutique/boutiqueService';
import { getStorageUrl } from '../../utils/image';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { SavedBoutique } from '../../types/boutique';

type Props = {
  navigation: {
    goBack(): void;
    navigate(screen: 'BoutiqueProfileScreen', params: { boutiqueId: string }): void;
    navigate(screen: 'BookAppointmentScreen', params: { boutiqueId: string }): void;
  };
};

export default function SavedBoutiquesScreen({ navigation }: Props) {
  const [boutiques, setBoutiques] = useState<SavedBoutique[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);

    const { data, error } = await getSavedBoutiques();
    if (error) {
      logger.error('SavedBoutiquesScreen: getSavedBoutiques failed', { error });
      setErrorMessage(error);
    } else {
      setBoutiques(data ?? []);
    }

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }

  async function handleUnsave(boutiqueId: string) {
    setBoutiques(prev => prev.filter(b => b.id !== boutiqueId));
    const { error } = await unsaveBoutique(boutiqueId);
    if (error) {
      logger.error('SavedBoutiquesScreen: unsaveBoutique failed', { error });
      load();
    }
  }

  const filtered = query.trim()
    ? boutiques.filter(b => b.name.toLowerCase().includes(query.trim().toLowerCase()))
    : boutiques;

  function renderCard({ item }: { item: SavedBoutique }) {
    const cover = (item.cover_photos ?? []).sort((a, b) => a.sort_order - b.sort_order)[0];
    const coverUri = cover ? getStorageUrl('dress-photos', cover.path) : null;
    const logoUri = item.logo_path ? getStorageUrl('boutique-logos', item.logo_path) : null;

    return (
      <View style={styles.card}>
        {/* Cover photo */}
        <View style={styles.coverWrapper}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={[styles.coverImage, styles.coverPlaceholder]}>
              <Ionicons name="storefront-outline" size={40} color="#DDD" />
            </View>
          )}
          <TouchableOpacity
            style={styles.unsaveButton}
            onPress={() => handleUnsave(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={18} color="#E53935" />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="cover" />
            ) : null}
            <Text style={styles.boutiqueName} numberOfLines={1}>{item.name}</Text>
          </View>

          {item.avg_rating > 0 ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color="#F5A623" />
              <Text style={styles.ratingText}>{item.avg_rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({item.review_count} {t('saved_boutiques.reviews')})</Text>
            </View>
          ) : null}

          {item.city ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="#888" />
              <Text style={styles.locationText}>{item.city}</Text>
            </View>
          ) : null}

          {item.about ? (
            <Text style={styles.aboutText} numberOfLines={2}>{item.about}</Text>
          ) : null}

          {item.specialty_tags && item.specialty_tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {item.specialty_tags.slice(0, 3).map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* CTAs */}
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={() => navigation.navigate('BoutiqueProfileScreen', { boutiqueId: item.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaSecondaryText}>{t('saved_boutiques.view_boutique')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() => navigation.navigate('BookAppointmentScreen', { boutiqueId: item.id })}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaPrimaryText}>{t('saved_boutiques.book')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('saved_boutiques.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#BBB" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('saved_boutiques.search_placeholder')}
          placeholderTextColor="#BBB"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color="#BBB" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => load()}>
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#C9A96E" />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="heart-outline" size={48} color="#DDD" />
              <Text style={styles.emptyTitle}>
                {query ? t('search.no_results') : t('saved_boutiques.empty_title')}
              </Text>
              {!query ? (
                <Text style={styles.emptySubtitle}>{t('saved_boutiques.empty_subtitle')}</Text>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    maxWidth: 430,
    alignSelf: 'center',
    width: '100%',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center' },
  retryButton: { backgroundColor: '#C9A96E', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center' },

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

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333', padding: 0 },

  list: { paddingHorizontal: 16, paddingVertical: 12, gap: 16, paddingBottom: 32 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  coverWrapper: { position: 'relative' },
  coverImage: { width: '100%', height: 180 },
  coverPlaceholder: { backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  unsaveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  cardBody: { padding: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  logo: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5' },
  boutiqueName: { flex: 1, fontSize: 18, fontWeight: '700', color: '#333' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#333' },
  reviewCount: { fontSize: 12, color: '#888' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  locationText: { fontSize: 13, color: '#888' },

  aboutText: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 10 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  tag: {
    backgroundColor: '#FDF6ED',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 11, color: '#C9A96E', fontWeight: '600' },

  ctaRow: { flexDirection: 'row', gap: 10 },
  ctaSecondary: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C9A96E',
    alignItems: 'center',
  },
  ctaSecondaryText: { fontSize: 14, fontWeight: '600', color: '#C9A96E' },
  ctaPrimary: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#C9A96E',
    alignItems: 'center',
  },
  ctaPrimaryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
