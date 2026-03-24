import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { DressWithBoutiqueDetails } from '../../types/dress';
import { getDressPhotoUrl } from '../../lib/supabase';

interface SavedDressCardProps {
  dress: DressWithBoutiqueDetails;
  onPress: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function SavedDressCard({ dress, onPress }: SavedDressCardProps) {
  const boutiqueName = dress.boutique_dresses[0]?.boutiques?.name ?? null;
  const coverPath = dress.dress_photos.find((p) => p.sort_order === 0)?.path ?? null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {getDressPhotoUrl(coverPath) !== 'no-image' ? (
        <Image source={{ uri: getDressPhotoUrl(coverPath) }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder} />
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{dress.title}</Text>
        {boutiqueName ? (
          <Text style={styles.boutique} numberOfLines={1}>{boutiqueName}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  info: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  boutique: {
    fontSize: 12,
    color: '#999',
  },
});
