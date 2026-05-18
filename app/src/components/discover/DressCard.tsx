import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { BoutiqueDress } from '../../types/dress';
import { getStorageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/currency';
import { t } from '../../i18n';

interface DressCardProps {
  dress: BoutiqueDress;
  onLike: () => void;
  onSkip: () => void;
  onPress: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = CARD_WIDTH * 1.4;
const SWIPE_THRESHOLD = 120;

export default function DressCard({ dress, onLike, onSkip, onPress }: DressCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const rotate = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const skipOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  function swipeOffRight() {
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH * 1.5,
      duration: 250,
      useNativeDriver: false,
    }).start(onLike);
  }

  function swipeOffLeft() {
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH * 1.5,
      duration: 250,
      useNativeDriver: false,
    }).start(onSkip);
  }

  function resetPosition() {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: false }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: false }),
    ]).start();
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderMove: Animated.event(
        [null, { dx: translateX, dy: translateY }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, g) => {
        const isTap = Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5;
        if (isTap) {
          onPress();
          return;
        }
        if (g.dx > SWIPE_THRESHOLD) {
          swipeOffRight();
        } else if (g.dx < -SWIPE_THRESHOLD) {
          swipeOffLeft();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const coverPath = dress.photos.find((p) => p.sort_order === 0)?.path ?? null;
  const imageUri = coverPath ? getStorageUrl('dress-photos', coverPath) : null;
  const priceDisplay = dress.price_sale !== null
    ? formatPrice(dress.price_sale, dress.price_currency)
    : null;

  return (
    <Animated.View
      style={[styles.card, { transform: [{ translateX }, { translateY }, { rotate }] }]}
      {...panResponder.panHandlers}
    >
      <Animated.View style={[styles.swipeLabel, styles.swipeLabelLike, { opacity: likeOpacity }]}>
        <Text style={styles.swipeLabelText}>{t('discover.like')}</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeLabel, styles.swipeLabelSkip, { opacity: skipOpacity }]}>
        <Text style={styles.swipeLabelText}>{t('discover.skip')}</Text>
      </Animated.View>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder} />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={styles.gradient}
      >
        <Text style={styles.title}>{dress.dress.title}</Text>
        {dress.dress.subtitle ? (
          <Text style={styles.subtitle}>{dress.dress.subtitle}</Text>
        ) : null}
        {priceDisplay !== null && (
          <Text style={styles.price}>{t('common.from')} {priceDisplay}</Text>
        )}
      </LinearGradient>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.skipButton]} onPress={swipeOffLeft} activeOpacity={0.8}>
          <Text style={styles.skipIcon}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={swipeOffRight} activeOpacity={0.8}>
          <Text style={styles.likeIcon}>♥</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F0EDE8',
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8E0D5',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 80,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
  },
  price: {
    fontSize: 14,
    color: '#C9A96E',
    fontWeight: '600',
  },
  swipeLabel: {
    position: 'absolute',
    top: 48,
    zIndex: 10,
    borderWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  swipeLabelLike: {
    left: 20,
    borderColor: '#C9A96E',
  },
  swipeLabelSkip: {
    right: 20,
    borderColor: '#CC3333',
  },
  swipeLabelText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  actions: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  skipButton: {
    backgroundColor: '#FFFFFF',
  },
  likeButton: {
    backgroundColor: '#C9A96E',
  },
  skipIcon: {
    fontSize: 22,
    color: '#CC3333',
    fontWeight: '700',
  },
  likeIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
});
