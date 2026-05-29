import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackActions } from '@react-navigation/native';

import AuthScreen from '../screens/auth/AuthScreen';
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import ExploreScreen from '../screens/explore/ExploreScreen';
import SavedScreen from '../screens/saved/SavedScreen';
import DressDetailScreen from '../screens/dress/DressDetailScreen';
import BoutiqueProfileScreen from '../screens/boutique/BoutiqueProfileScreen';
import CompareScreen from '../screens/compare/CompareScreen';
import TryOnCollectionScreen from '../screens/tryon/TryOnCollectionScreen';
import TryOnScreen from '../screens/tryon/TryOnScreen';
import ReferencePhotoScreen from '../screens/tryon/ReferencePhotoScreen';
import TryOnResultScreen from '../screens/tryon/TryOnResultScreen';
import BookAppointmentScreen from '../screens/appointments/BookAppointmentScreen';
import SearchScreen from '../screens/search/SearchScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import InboxScreen from '../screens/messages/InboxScreen';
import ConversationScreen from '../screens/messages/ConversationScreen';
import MarketplaceHomeScreen from '../screens/marketplace/MarketplaceHomeScreen';
import CategoryListingScreen from '../screens/marketplace/CategoryListingScreen';
import VendorListingScreen from '../screens/marketplace/VendorListingScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import GeneralInformationScreen from '../screens/profile/GeneralInformationScreen';
import BridalDNAScreen from '../screens/profile/BridalDNAScreen';
import ShareYourStoryScreen from '../screens/profile/ShareYourStoryScreen';
import ShoppingPreferencesScreen from '../screens/profile/ShoppingPreferencesScreen';
import BuildYourMoodboardScreen from '../screens/profile/BuildYourMoodboardScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import PromoCodeScreen from '../screens/profile/PromoCodeScreen';
import AppointmentsScreen from '../screens/appointments/AppointmentsScreen';
import SavedBoutiquesScreen from '../screens/boutique/SavedBoutiquesScreen';

import type {
  AuthStackParamList,
  DiscoverStackParamList,
  ExploreStackParamList,
  SavedStackParamList,
  SearchStackParamList,
  MessagesStackParamList,
  MarketplaceStackParamList,
  AppTabParamList,
  ProfileStackParamList,
  RootStackParamList,
} from '../types/navigation';

const AuthNav = createStackNavigator<AuthStackParamList>();
const DiscoverNav = createStackNavigator<DiscoverStackParamList>();
const ExploreNav = createStackNavigator<ExploreStackParamList>();
const SavedNav = createStackNavigator<SavedStackParamList>();
const SearchNav = createStackNavigator<SearchStackParamList>();
const MessagesNav = createStackNavigator<MessagesStackParamList>();
const MarketplaceNav = createStackNavigator<MarketplaceStackParamList>();
const ProfileNav = createStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();
const RootNav = createStackNavigator<RootStackParamList>();

export function AuthStack() {
  return (
    <AuthNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthNav.Screen name="AuthScreen" component={AuthScreen} />
    </AuthNav.Navigator>
  );
}

function DiscoverStack() {
  return (
    <DiscoverNav.Navigator screenOptions={{ headerShown: false }}>
      <DiscoverNav.Screen name="DiscoverScreen" component={DiscoverScreen} />
      <DiscoverNav.Screen name="DressDetailScreen" component={DressDetailScreen as React.ComponentType} />
      <DiscoverNav.Screen name="BoutiqueProfileScreen" component={BoutiqueProfileScreen as React.ComponentType} />
      <DiscoverNav.Screen name="TryOnScreen" component={TryOnScreen as React.ComponentType} />
      <DiscoverNav.Screen name="ReferencePhotoScreen" component={ReferencePhotoScreen as React.ComponentType} />
      <DiscoverNav.Screen name="TryOnResultScreen" component={TryOnResultScreen as React.ComponentType} />
      <DiscoverNav.Screen name="BookAppointmentScreen" component={BookAppointmentScreen as React.ComponentType} />
    </DiscoverNav.Navigator>
  );
}

function ExploreStack() {
  return (
    <ExploreNav.Navigator screenOptions={{ headerShown: false }}>
      <ExploreNav.Screen name="ExploreScreen" component={ExploreScreen} />
      <ExploreNav.Screen name="DressDetailScreen" component={DressDetailScreen as React.ComponentType} />
      <ExploreNav.Screen name="BoutiqueProfileScreen" component={BoutiqueProfileScreen as React.ComponentType} />
      <ExploreNav.Screen name="TryOnScreen" component={TryOnScreen as React.ComponentType} />
      <ExploreNav.Screen name="ReferencePhotoScreen" component={ReferencePhotoScreen as React.ComponentType} />
      <ExploreNav.Screen name="TryOnResultScreen" component={TryOnResultScreen as React.ComponentType} />
      <ExploreNav.Screen name="BookAppointmentScreen" component={BookAppointmentScreen as React.ComponentType} />
    </ExploreNav.Navigator>
  );
}

function SavedStack() {
  return (
    <SavedNav.Navigator screenOptions={{ headerShown: false }}>
      <SavedNav.Screen name="SavedScreen" component={SavedScreen} />
      <SavedNav.Screen name="DressDetailScreen" component={DressDetailScreen as React.ComponentType} />
      <SavedNav.Screen name="BoutiqueProfileScreen" component={BoutiqueProfileScreen as React.ComponentType} />
      <SavedNav.Screen name="CompareScreen" component={CompareScreen} />
      <SavedNav.Screen name="TryOnCollectionScreen" component={TryOnCollectionScreen} />
      <SavedNav.Screen name="TryOnScreen" component={TryOnScreen as React.ComponentType} />
      <SavedNav.Screen name="ReferencePhotoScreen" component={ReferencePhotoScreen as React.ComponentType} />
      <SavedNav.Screen name="TryOnResultScreen" component={TryOnResultScreen as React.ComponentType} />
      <SavedNav.Screen name="BookAppointmentScreen" component={BookAppointmentScreen as React.ComponentType} />
    </SavedNav.Navigator>
  );
}

function MarketplaceStack() {
  return (
    <MarketplaceNav.Navigator screenOptions={{ headerShown: false }}>
      <MarketplaceNav.Screen name="MarketplaceHomeScreen" component={MarketplaceHomeScreen} />
      <MarketplaceNav.Screen name="CategoryListingScreen" component={CategoryListingScreen as React.ComponentType} />
      <MarketplaceNav.Screen name="VendorListingScreen" component={VendorListingScreen as React.ComponentType} />
    </MarketplaceNav.Navigator>
  );
}

function SearchStack() {
  return (
    <SearchNav.Navigator screenOptions={{ headerShown: false }}>
      <SearchNav.Screen name="SearchScreen" component={SearchScreen} />
      <SearchNav.Screen name="DressDetailScreen" component={DressDetailScreen as React.ComponentType} />
      <SearchNav.Screen name="BoutiqueProfileScreen" component={BoutiqueProfileScreen as React.ComponentType} />
      <SearchNav.Screen name="BookAppointmentScreen" component={BookAppointmentScreen as React.ComponentType} />
    </SearchNav.Navigator>
  );
}

function MessagesStack() {
  return (
    <MessagesNav.Navigator screenOptions={{ headerShown: false }}>
      <MessagesNav.Screen name="InboxScreen" component={InboxScreen} />
      <MessagesNav.Screen name="ConversationScreen" component={ConversationScreen} />
    </MessagesNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileNav.Screen name="UserProfileScreen" component={UserProfileScreen as React.ComponentType} />
      <ProfileNav.Screen name="ProfileScreen" component={ProfileScreen} />
      <ProfileNav.Screen name="EditProfileScreen" component={EditProfileScreen as React.ComponentType} />
      <ProfileNav.Screen name="PromoCodeScreen" component={PromoCodeScreen as React.ComponentType} />
      <ProfileNav.Screen name="AppointmentsScreen" component={AppointmentsScreen as React.ComponentType} />
      <ProfileNav.Screen name="SavedBoutiquesScreen" component={SavedBoutiquesScreen as React.ComponentType} />
      <ProfileNav.Screen name="BoutiqueProfileScreen" component={BoutiqueProfileScreen as React.ComponentType} />
      <ProfileNav.Screen name="BookAppointmentScreen" component={BookAppointmentScreen as React.ComponentType} />
      <ProfileNav.Screen name="GeneralInformationScreen" component={GeneralInformationScreen} />
      <ProfileNav.Screen name="BridalDNAScreen" component={BridalDNAScreen} />
      <ProfileNav.Screen name="ShareYourStoryScreen" component={ShareYourStoryScreen} />
      <ProfileNav.Screen name="ShoppingPreferencesScreen" component={ShoppingPreferencesScreen} />
      <ProfileNav.Screen name="BuildYourMoodboardScreen" component={BuildYourMoodboardScreen} />
      <ProfileNav.Screen name="SettingsScreen" component={SettingsScreen} />
      <ProfileNav.Screen name="ReferencePhotoScreen" component={ReferencePhotoScreen as React.ComponentType} />
    </ProfileNav.Navigator>
  );
}

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof AppTabParamList, { active: TabIconName; inactive: TabIconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Explore: { active: 'compass', inactive: 'compass-outline' },
  Saved: { active: 'heart', inactive: 'heart-outline' },
  Marketplace: { active: 'bag', inactive: 'bag-outline' },
  Community: { active: 'people', inactive: 'people-outline' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#E53935',
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
      <Tab.Screen name="Home" component={DiscoverStack} options={{ tabBarLabel: 'Discover' }} />
      <Tab.Screen name="Explore" component={ExploreStack} />
      <Tab.Screen
        name="Saved"
        component={SavedStack}
        listeners={({ navigation, route }) => ({
          tabPress: () => {
            const state = (route as { state?: { index?: number; key?: string } }).state;
            if (state && typeof state.index === 'number' && state.index > 0 && state.key) {
              navigation.dispatch({ ...StackActions.popToTop(), target: state.key });
            }
          },
        })}
      />
      <Tab.Screen name="Marketplace" component={MarketplaceStack} />
      <Tab.Screen name="Community" component={CommunityScreen} />
    </Tab.Navigator>
  );
}

export function AppStack() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('bridee_onboarding_done').then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  if (onboardingDone === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#C9A96E" />
      </View>
    );
  }

  return (
    <RootNav.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={onboardingDone ? 'MainTabs' : 'Onboarding'}
    >
      <RootNav.Screen name="Onboarding" component={OnboardingScreen} />
      <RootNav.Screen name="MainTabs" component={MainTabs} />
      <RootNav.Screen
        name="ProfileStack"
        component={ProfileStack}
        options={{ presentation: 'modal' }}
      />
      <RootNav.Screen
        name="SearchStack"
        component={SearchStack}
        options={{ presentation: 'modal' }}
      />
      <RootNav.Screen
        name="MessagesStack"
        component={MessagesStack}
        options={{ presentation: 'modal' }}
      />
    </RootNav.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
