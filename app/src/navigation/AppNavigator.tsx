import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from '../screens/auth/AuthScreen';
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import HomeScreen from '../screens/home/HomeScreen';
import MarketplaceScreen from '../screens/marketplace/MarketplaceScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import { AuthStackParamList, AppTabParamList } from '../types/navigation';

const AuthNav = createStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

export function AuthStack() {
  return (
    <AuthNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthNav.Screen name="AuthScreen" component={AuthScreen} />
    </AuthNav.Navigator>
  );
}

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof AppTabParamList, { active: TabIconName; inactive: TabIconName }> = {
  Discover: { active: 'home', inactive: 'home-outline' },
  Saved: { active: 'bookmark', inactive: 'bookmark-outline' },
  Marketplace: { active: 'storefront', inactive: 'storefront-outline' },
  Community: { active: 'people', inactive: 'people-outline' },
  Messages: { active: 'chatbubble', inactive: 'chatbubble-outline' },
};

export function AppStack() {
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
      <Tab.Screen name="Saved" component={HomeScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
    </Tab.Navigator>
  );
}
