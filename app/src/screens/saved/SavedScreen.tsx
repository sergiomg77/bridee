import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import ScreenHeader from '../../components/shared/ScreenHeader';
import SavedDressCard from '../../components/saved/SavedDressCard';
import { getSavedDresses } from '../../services/swipe/swipeService';
import { t } from '../../i18n';
import logger from '../../lib/logger';
import type { BoutiqueDress } from '../../types/dress';
import type { SavedStackParamList } from '../../types/navigation';

type Props = StackScreenProps<SavedStackParamList, 'SavedScreen'>;

export default function SavedScreen({ navigation }: Props) {
  const [dresses, setDresses] = useState<BoutiqueDress[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    setLoading(true);
    setSelectMode(false);
    setSelectedIds(new Set());
    const { data, error } = await getSavedDresses();
    if (error) {
      logger.error('SavedScreen: getSavedDresses failed', { error });
      setErrorMessage(error);
    } else {
      setDresses(data ?? []);
      setErrorMessage(null);
    }
    setLoading(false);
  }

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }

  function handleCardPress(dress: BoutiqueDress) {
    if (selectMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(dress.id)) {
          next.delete(dress.id);
        } else if (next.size < 3) {
          next.add(dress.id);
        }
        return next;
      });
    } else {
      navigation.navigate('DressDetailScreen', { boutiqueDressId: dress.id });
    }
  }

  function handleCompare() {
    const ids = Array.from(selectedIds);
    if (ids.length < 1) return;
    navigation.navigate('CompareScreen', { boutiqueDressIds: ids });
  }

  const selectedCount = selectedIds.size;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('saved.title')}
        showFilter={!selectMode}
        onFilterPress={toggleSelectMode}
      />

      {/* My Try-Ons entry */}
      {!selectMode && (
        <TouchableOpacity
          style={styles.tryOnBar}
          onPress={() => navigation.navigate('TryOnCollectionScreen')}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles-outline" size={16} color="#C9A96E" />
          <Text style={styles.tryOnBarText}>{t('saved.my_tryons')}</Text>
          <Ionicons name="chevron-forward" size={16} color="#C9A96E" />
        </TouchableOpacity>
      )}

      {selectMode && (
        <View style={styles.selectBar}>
          <Text style={styles.selectHint}>{t('saved.compare_hint')}</Text>
          <TouchableOpacity onPress={toggleSelectMode}>
            <Text style={styles.doneText}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9A96E" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : dresses.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="heart-outline" size={48} color="#DDD" />
          <Text style={styles.emptyTitle}>{t('saved.empty_title')}</Text>
          <Text style={styles.emptySubtitle}>{t('saved.empty_subtitle')}</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={dresses}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <SavedDressCard
                dress={item}
                onPress={() => handleCardPress(item)}
                selected={selectedIds.has(item.id)}
                selectMode={selectMode}
              />
            )}
          />

          {selectMode && selectedCount >= 1 && (
            <View style={styles.compareBar}>
              <TouchableOpacity style={styles.compareButton} onPress={handleCompare} activeOpacity={0.85}>
                <Text style={styles.compareButtonText}>
                  {t('saved.compare')} ({selectedCount})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF8EE',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8D8',
  },
  selectHint: {
    fontSize: 13,
    color: '#C9A96E',
  },
  doneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C9A96E',
  },
  grid: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
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
  compareBar: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  compareButton: {
    backgroundColor: '#C9A96E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  compareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  tryOnBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF8EE',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8D8',
  },
  tryOnBarText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#C9A96E',
  },
});
