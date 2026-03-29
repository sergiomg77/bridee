import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { navigationRef } from '../../navigation/navigationRef';

type Props = {
  title: string;
  showFilter?: boolean;
  onFilterPress?: () => void;
  onUserPress?: () => void;
};

export default function ScreenHeader({ title, showFilter = false, onFilterPress, onUserPress }: Props) {
  function handleUserPress() {
    if (onUserPress) {
      onUserPress();
    } else if (navigationRef.isReady()) {
      navigationRef.navigate('ProfileStack');
    }
  }

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.icons}>
        {showFilter && (
          <TouchableOpacity style={styles.iconButton} onPress={onFilterPress} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={22} color="#333" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.iconButton} onPress={handleUserPress} activeOpacity={0.7}>
          <Ionicons name="person-circle-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 16,
  },
});
