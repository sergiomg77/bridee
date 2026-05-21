import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { BoutiqueDress } from '../../types/dress';
import { getStorageUrl } from '../../utils/image';

interface SavedDressCardProps {
  dress: BoutiqueDress;
  onPress: () => void;
  selected?: boolean;
  selectMode?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function SavedDressCard({ dress, onPress, selected = false, selectMode = false }: SavedDressCardProps) {
  const coverPath = dress.dresses?.dress_photos?.find((p) => p.sort_order === 0)?.path ?? null;
  const imageUri = coverPath ? getStorageUrl('dress-photos', coverPath) : null;

  return (
    <TouchableOpacity style={[styles.card, selected && styles.cardSelected]} onPress={onPress} activeOpacity={0.85}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder} />
      )}

      {selectMode && (
        <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
          {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{dress.dresses?.title}</Text>
        {dress.boutiques?.name ? (
          <Text style={styles.boutique} numberOfLines={1}>{dress.boutiques.name}</Text>
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
  cardSelected: {
    borderWidth: 2,
    borderColor: '#C9A96E',
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
  checkCircle: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#C9A96E',
    borderColor: '#C9A96E',
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
