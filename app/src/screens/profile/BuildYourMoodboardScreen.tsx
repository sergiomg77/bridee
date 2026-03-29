import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { ProfileStackParamList } from '../../types/navigation';

type Props = StackScreenProps<ProfileStackParamList, 'BuildYourMoodboardScreen'>;

export default function BuildYourMoodboardScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Build Your Moodboard</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <Ionicons name="images-outline" size={48} color="#DDD" />
        <Text style={styles.comingSoon}>Coming soon…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#333', textAlign: 'center' },
  headerSpacer: { width: 24 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  comingSoon: { fontSize: 16, color: '#999' },
});
