import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import ScreenHeader from '../../components/shared/ScreenHeader';
import { supabase, getTryOnResultUrl } from '../../lib/supabase';
import logger from '../../lib/logger';
import { fetchTryOnResults, markResultAsSeen, TryOnResult } from '../../services/tryon/tryonResultService';
import { TryOnStackParamList } from '../../types/navigation';

type Props = StackScreenProps<TryOnStackParamList, 'TryOnResultsScreen'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function TryOnResultsScreen({ navigation }: Props) {
  const [results, setResults] = useState<TryOnResult[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        logger.error('TryOnResultsScreen: failed to get session', sessionError);
        setErrorMessage('Could not load your try-on results.');
        setLoading(false);
        return;
      }

      const userId = sessionData.session?.user.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await fetchTryOnResults(supabase, userId);
      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      const items = data ?? [];
      setResults(items);

      const urlEntries = await Promise.all(
        items.map(async (item) => {
          const url = await getTryOnResultUrl(item.result_path);
          return [item.id, url] as [string, string | null];
        })
      );

      const urlMap: Record<string, string> = {};
      for (const [id, url] of urlEntries) {
        if (url) urlMap[id] = url;
      }
      setSignedUrls(urlMap);
      setLoading(false);
    }

    load();
  }, []);

  async function handleCardPress(item: TryOnResult) {
    await markResultAsSeen(supabase, item.id);
    setResults((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, seen_at: new Date().toISOString() } : r))
    );
    navigation.navigate('TryOnResultDetailScreen', {
      jobId: item.id,
      dressId: item.dress_id ?? '',
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Try On" />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="sparkles-outline" size={48} color="#DDD" />
          <Text style={styles.emptyTitle}>No try-ons yet</Text>
          <Text style={styles.emptySubtitle}>
            Find a dress and tap Try it on to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            const isUnseen = item.seen_at === null;
            const imageUrl = signedUrls[item.id] ?? null;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleCardPress(item)}
                activeOpacity={0.85}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder} />
                )}
                {isUnseen && <View style={styles.unseenBadge} />}
              </TouchableOpacity>
            );
          }}
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
  grid: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: CARD_WIDTH * 1.3,
  },
  imagePlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 1.3,
    backgroundColor: '#F0EDE8',
  },
  unseenBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 15,
    color: '#CC3333',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
