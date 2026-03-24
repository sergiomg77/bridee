import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { supabase, getTryOnResultUrl } from '../../lib/supabase';
import logger from '../../lib/logger';
import { TryOnStackParamList } from '../../types/navigation';

type Props = StackScreenProps<TryOnStackParamList, 'TryOnResultDetailScreen'>;

type TryOnJob = {
  id: string;
  result_path: string | null;
  dress_id: string | null;
};

export default function TryOnResultDetailScreen({ navigation, route }: Props) {
  const { jobId, dressId } = route.params;
  const [job, setJob] = useState<TryOnJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('tryon_queue')
        .select('id, result_path, dress_id')
        .eq('id', jobId)
        .single();

      if (error) {
        logger.error('TryOnResultDetailScreen: failed to fetch job', error);
        setErrorMessage('Could not load this try-on result.');
        setLoading(false);
        return;
      }

      setJob(data as TryOnJob);
      setLoading(false);
    }

    load();
  }, [jobId]);

  const imageUrl = getTryOnResultUrl(job?.result_path);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : imageUrl !== 'no-image' ? (
        <Image source={{ uri: imageUrl }} style={styles.fullImage} resizeMode="contain" />
      ) : (
        <View style={styles.centered}>
          <Text style={styles.errorText}>No result image available.</Text>
        </View>
      )}

      {!loading && !errorMessage && dressId ? (
        <SafeAreaView style={styles.bottomSafe}>
          <TouchableOpacity
            style={styles.viewDressButton}
            onPress={() => navigation.navigate('DressDetailScreen', { dressId })}
            activeOpacity={0.85}
          >
            <Text style={styles.viewDressText}>View Dress</Text>
          </TouchableOpacity>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    flex: 1,
    width: '100%',
  },
  bottomSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  viewDressButton: {
    margin: 24,
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewDressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 15,
    color: '#CCCCCC',
    textAlign: 'center',
  },
});
