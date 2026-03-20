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
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { fetchDressById } from '../../services/dress/dressService';
import { DressWithBoutiqueDetails } from '../../types/dress';
import { SavedStackParamList } from '../../types/navigation';

type Props = StackScreenProps<SavedStackParamList, 'DressDetailScreen'>;

export default function DressDetailScreen({ route, navigation }: Props) {
  const { dressId } = route.params;

  const [dress, setDress] = useState<DressWithBoutiqueDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const activeBoutiques = dress.boutique_dresses.filter((b) => b.is_active);
  const minPrice = activeBoutiques.length > 0
    ? Math.min(...activeBoutiques.map((b) => b.price))
    : null;
  const allSizes = [...new Set(activeBoutiques.flatMap((b) => b.available_sizes))].sort();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo */}
        <View style={styles.imageContainer}>
          {dress.image_url ? (
            <Image source={{ uri: dress.image_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder} />
          )}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.details}>
          {/* Title & subtitle */}
          <Text style={styles.title}>{dress.title}</Text>
          <Text style={styles.subtitle}>{dress.subtitle}</Text>

          {/* Price */}
          {minPrice !== null && (
            <Text style={styles.price}>From £{minPrice.toLocaleString()}</Text>
          )}

          {/* Color */}
          <View style={styles.row}>
            <Text style={styles.label}>Colour</Text>
            <View style={styles.colorRow}>
              <View style={[styles.colorSwatch, { backgroundColor: dress.color_code }]} />
              <Text style={styles.colorName}>{dress.color_name}</Text>
            </View>
          </View>

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
                  <Text style={styles.boutiquePrice}>£{b.price.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>About this dress</Text>
            <Text style={styles.description}>{dress.long_description}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 420,
  },
  imagePlaceholder: {
    width: '100%',
    height: 420,
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
  details: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
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
