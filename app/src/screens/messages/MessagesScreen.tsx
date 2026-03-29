import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

import ScreenHeader from '../../components/shared/ScreenHeader';

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Messages" />
      <View style={styles.content}>
        <Text style={styles.text}>Coming soon</Text>
      </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    color: '#999',
    fontWeight: '500',
  },
});
