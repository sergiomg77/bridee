import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from '../screens/auth/AuthScreen';
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import SavedScreen from '../screens/saved/SavedScreen';
import DressDetailScreen from '../screens/dress/DressDetailScreen';
import TryOnInstructionScreen from '../screens/tryon/TryOnInstructionScreen';
import TryOnResultsScreen from '../screens/tryon/TryOnResultsScreen';
import TryOnResultDetailScreen from '../screens/tryon/TryOnResultDetailScreen';
import MarketplaceScreen from '../screens/marketplace/MarketplaceScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import { supabase } from '../lib/supabase';
import { getUnseenCount } from '../services/tryon/tryonResultService';
import logger from '../lib/logger';
import {
  AuthStackParamList,
  SavedStackParamList,
  TryOnStackParamList,
  AppTabParamList,
} from '../types/navigation';

const AuthNav = createStackNavigator<AuthStackParamList>();
const SavedNav = createStackNavigator<SavedStackParamList>();
const TryOnNav = createStackNavigator<TryOnStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

export function AuthStack() {
  return (
    <AuthNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthNav.Screen name="AuthScreen" component={AuthScreen} />
    </AuthNav.Navigator>
  );
}

function SavedStack() {
  return (
    <SavedNav.Navigator screenOptions={{ headerShown: false }}>
      <SavedNav.Screen name="SavedScreen" component={SavedScreen} />
      <SavedNav.Screen name="DressDetailScreen" component={DressDetailScreen} />
      <SavedNav.Screen name="TryOnInstructionScreen" component={TryOnInstructionScreen} />
    </SavedNav.Navigator>
  );
}

function TryOnStack() {
  return (
    <TryOnNav.Navigator screenOptions={{ headerShown: false }}>
      <TryOnNav.Screen name="TryOnResultsScreen" component={TryOnResultsScreen} />
      <TryOnNav.Screen name="TryOnResultDetailScreen" component={TryOnResultDetailScreen} />
      <TryOnNav.Screen name="DressDetailScreen" component={DressDetailScreen} />
    </TryOnNav.Navigator>
  );
}

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof AppTabParamList, { active: TabIconName; inactive: TabIconName }> = {
  Discover: { active: 'home', inactive: 'home-outline' },
  Saved: { active: 'bookmark', inactive: 'bookmark-outline' },
  TryOn: { active: 'sparkles', inactive: 'sparkles-outline' },
  Marketplace: { active: 'storefront', inactive: 'storefront-outline' },
  Community: { active: 'people', inactive: 'people-outline' },
  Messages: { active: 'chatbubble', inactive: 'chatbubble-outline' },
};

export function AppStack() {
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    async function loadUnseenCount() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        logger.error('AppStack: failed to get session for badge', sessionError);
        return;
      }
      const userId = sessionData.session?.user.id;
      if (!userId) return;

      const { data, error } = await getUnseenCount(supabase, userId);
      if (error) {
        logger.error('AppStack: failed to get unseen count', error);
        return;
      }
      setUnseenCount(data ?? 0);
    }

    loadUnseenCount();

    const interval = setInterval(loadUnseenCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#C9A96E',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0F0F0',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name as keyof AppTabParamList];
          const iconName = focused ? icons.active : icons.inactive;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Saved" component={SavedStack} />
      <Tab.Screen
        name="TryOn"
        component={TryOnStack}
        options={{
          tabBarLabel: 'Try On',
          tabBarBadge: unseenCount > 0 ? unseenCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#E53935' },
        }}
      />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
    </Tab.Navigator>
  );
}
