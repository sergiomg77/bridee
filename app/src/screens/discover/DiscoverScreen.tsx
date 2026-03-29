import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';

import ScreenHeader from '../../components/shared/ScreenHeader';
import DressCard from '../../components/discover/DressCard';
import { fetchDresses, likeDress } from '../../services/dress/dressService';
import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import { DressWithBoutique } from '../../types/dress';

export default function DiscoverScreen() {
  const [dresses, setDresses] = useState<DressWithBoutique[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        logger.error('DiscoverScreen: failed to get session', sessionError);
      } else {
        userIdRef.current = sessionData.session?.user.id ?? null;
      }

      const { data, error } = await fetchDresses();
      if (error) {
        setErrorMessage(error.message);
      } else {
        setDresses(data ?? []);
      }
      setLoading(false);
    }

    load();
  }, []);

  async function handleLike() {
    const dress = dresses[currentIndex];
    if (!dress) return;

    if (userIdRef.current) {
      const { error } = await likeDress(userIdRef.current, dress.id);
      if (error) {
        logger.error('handleLike: likeDress failed', error);
      } else {
        logger.info('Dress liked', { dressId: dress.id });
      }
    } else {
      logger.warn('handleLike: no userId, skipping likeDress call');
    }

    setCurrentIndex((prev) => prev + 1);
  }

  function handleSkip() {
    logger.info('Dress skipped', { dressId: dresses[currentIndex]?.id });
    setCurrentIndex((prev) => prev + 1);
  }

  const currentDress = dresses[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Discover" />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : currentDress ? (
        <View style={styles.cardContainer}>
          <DressCard
            key={currentDress.id}
            dress={currentDress}
            onLike={handleLike}
            onSkip={handleSkip}
          />
        </View>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No more dresses</Text>
          <Text style={styles.emptySubtitle}>Check back soon for new arrivals</Text>
        </View>
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
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#CC3333',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
  },
});
