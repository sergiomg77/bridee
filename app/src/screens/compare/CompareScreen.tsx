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
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { getDressDetail } from '../../services/dress/dressService';
import { getStorageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/currency';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { BoutiqueDress } from '../../types/dress';
import type { SavedStackParamList } from '../../types/navigation';

type Props = StackScreenProps<SavedStackParamList, 'CompareScreen'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_W = Math.min(SCREEN_WIDTH, 430);

export default function CompareScreen({ route, navigation }: Props) {
  const { boutiqueDressIds } = route.params;

  const [dresses, setDresses] = useState<(BoutiqueDress | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const results = await Promise.all(boutiqueDressIds.map((id) => getDressDetail(id)));
      const hasError = results.some((r) => r.error);
      if (hasError) {
        const firstError = results.find((r) => r.error)?.error;
        logger.error('CompareScreen: getDressDetail failed', { error: firstError });
        setErrorMessage(firstError ?? t('common.error'));
      } else {
        setDresses(results.map((r) => r.data));
      }
    } catch (err) {
      logger.error('CompareScreen: unexpected error', err);
      setErrorMessage(t('common.error'));
    }
    setLoading(false);
  }

  const loaded = dresses.filter((d): d is BoutiqueDress => d !== null);
  const colW = loaded.length > 0 ? (MAX_W - 100) / loaded.length : 1;

  function noData() {
    return <Text style={styles.cellText}>{t('compare.no_data')}</Text>;
  }

  function renderHeaderRow() {
    return (
      <View style={styles.row}>
        <View style={styles.labelCell} />
        {loaded.map((dress) => {
          const coverPath = dress.dresses?.dress_photos?.find((p) => p.sort_order === 0)?.path ?? null;
          const imgUri = coverPath ? getStorageUrl('dress-photos', coverPath) : null;
          return (
            <View key={dress.id} style={[styles.headerCell, { width: colW }]}>
              {imgUri ? (
                <Image source={{ uri: imgUri }} style={[styles.headerImage, { width: colW - 8, height: (colW - 8) * 1.3 }]} resizeMode="cover" />
              ) : (
                <View style={[styles.headerImagePlaceholder, { width: colW - 8, height: (colW - 8) * 1.3 }]} />
              )}
              <Text style={styles.headerTitle} numberOfLines={2}>{dress.dresses?.title}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  function renderRow(labelKey: string, getValue: (d: BoutiqueDress) => string | null) {
    return (
      <View style={[styles.row, styles.dataRow]}>
        <View style={styles.labelCell}>
          <Text style={styles.labelText}>{t(labelKey)}</Text>
        </View>
        {loaded.map((dress) => {
          const val = getValue(dress);
          return (
            <View key={dress.id} style={[styles.dataCell, { width: colW }]}>
              {val ? <Text style={styles.cellText}>{val}</Text> : noData()}
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('compare.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderHeaderRow()}
          {renderRow('compare.price', (d) => {
            if (d.price_sale !== null) return formatPrice(d.price_sale, d.price_currency);
            if (d.price_range_min !== null && d.price_range_max !== null) {
              return `${formatPrice(d.price_range_min, d.price_currency)} – ${formatPrice(d.price_range_max, d.price_currency)}`;
            }
            return null;
          })}
          {renderRow('compare.boutique', (d) => `${d.boutiques?.name ?? ''}${d.boutiques?.city ? ` · ${d.boutiques.city}` : ''}`)}
          {renderRow('compare.color', (d) => d.dresses?.color_name ?? null)}
          {renderRow('compare.size', (d) =>
            d.available_sizes && d.available_sizes.length > 0 ? d.available_sizes.join(', ') : null
          )}
          {renderRow('compare.style', (d) =>
            d.dresses?.style_tags && d.dresses.style_tags.length > 0 ? d.dresses.style_tags.join(', ') : null
          )}
          {renderRow('dress_detail.silhouette', (d) => d.dresses?.silhouette ?? null)}
          {renderRow('dress_detail.neckline', (d) => d.dresses?.neckline ?? null)}
          {renderRow('dress_detail.fabric', (d) =>
            d.dresses?.fabric && d.dresses.fabric.length > 0 ? d.dresses.fabric.join(', ') : null
          )}
          {renderRow('dress_detail.condition', (d) => d.dresses?.condition ?? null)}

          {/* View dress buttons */}
          <View style={[styles.row, styles.dataRow]}>
            <View style={styles.labelCell} />
            {loaded.map((dress) => (
              <View key={dress.id} style={[styles.dataCell, { width: colW }]}>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => navigation.navigate('DressDetailScreen', { boutiqueDressId: dress.id })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.viewButtonText}>{t('tryon.view_dress')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
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
  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#C9A96E',
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dataRow: { backgroundColor: '#FFFFFF' },

  labelCell: {
    width: 92,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  headerCell: { paddingVertical: 16, paddingHorizontal: 4, alignItems: 'center', gap: 8 },
  headerImage: { borderRadius: 10 },
  headerImagePlaceholder: { borderRadius: 10, backgroundColor: '#F0EDE8' },

  dataCell: { paddingVertical: 14, paddingHorizontal: 8, justifyContent: 'center' },
  cellText: { fontSize: 13, color: '#333' },

  viewButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  viewButtonText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
});
