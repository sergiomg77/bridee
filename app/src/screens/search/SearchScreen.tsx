import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { searchDresses } from '../../services/dress/dressService';
import { getStorageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/currency';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { BoutiqueDress } from '../../types/dress';
import type { SearchStackParamList } from '../../types/navigation';

type Props = StackScreenProps<SearchStackParamList, 'SearchScreen'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_WIDTH, 430) - 32;

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BoutiqueDress[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      runSearch(query.trim());
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function runSearch(q: string) {
    setSearching(true);
    setHasSearched(true);
    const { data, error } = await searchDresses({ q });
    if (error) {
      logger.error('SearchScreen: searchDresses failed', { error });
    }
    setResults(data ?? []);
    setSearching(false);
  }

  function renderItem({ item }: { item: BoutiqueDress }) {
    const coverPath = item.dresses?.dress_photos?.find((p) => p.sort_order === 0)?.path ?? null;
    const imageUri = coverPath ? getStorageUrl('dress-photos', coverPath) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DressDetailScreen', { boutiqueDressId: item.id })}
        activeOpacity={0.85}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder} />
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.dresses?.title}</Text>
          <Text style={styles.cardBoutique} numberOfLines={1}>{item.boutiques?.name}</Text>
          {item.price_sale !== null && (
            <Text style={styles.cardPrice}>
              {formatPrice(item.price_sale, item.price_currency)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#BBB"
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => {
              if (query.trim().length >= 2) runSearch(query.trim());
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color="#BBB" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
          <Text style={styles.searchingText}>{t('search.searching')}</Text>
        </View>
      ) : hasSearched && results.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color="#DDD" />
          <Text style={styles.noResultsText}>{t('search.no_results')}</Text>
          <Text style={styles.tryDifferentText}>{t('search.try_different')}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            results.length > 0 ? (
              <Text style={styles.resultCount}>{results.length} results</Text>
            ) : null
          }
        />
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

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  backButton: { padding: 4 },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {},
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    padding: 0,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  searchingText: { fontSize: 14, color: '#999', marginTop: 12 },
  noResultsText: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 8 },
  tryDifferentText: { fontSize: 14, color: '#999', textAlign: 'center' },

  list: { padding: 16, gap: 12 },
  resultCount: { fontSize: 13, color: '#999', marginBottom: 8 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: { width: 90, height: 110 },
  cardImagePlaceholder: { width: 90, height: 110, backgroundColor: '#F0EDE8' },
  cardInfo: { flex: 1, padding: 14, justifyContent: 'center', gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  cardBoutique: { fontSize: 12, color: '#999' },
  cardPrice: { fontSize: 14, fontWeight: '700', color: '#C9A96E' },
});
