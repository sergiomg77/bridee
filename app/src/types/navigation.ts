import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  AuthScreen: undefined;
};

export type MessagesStackParamList = {
  InboxScreen: undefined;
  ConversationScreen: { conversationId: string; participantName: string };
};

export type DiscoverStackParamList = {
  DiscoverScreen: undefined;
  DressDetailScreen: { boutiqueDressId: string };
  BoutiqueProfileScreen: { boutiqueId: string };
  TryOnScreen: { boutiqueDressId: string };
  ReferencePhotoScreen: { boutiqueDressId: string };
  TryOnResultScreen: { jobId: string; boutiqueDressId: string };
  BookAppointmentScreen: { boutiqueId: string; boutiqueDressId?: string };
};

export type ExploreStackParamList = {
  ExploreScreen: undefined;
  DressDetailScreen: { boutiqueDressId: string };
  BoutiqueProfileScreen: { boutiqueId: string };
  TryOnScreen: { boutiqueDressId: string };
  ReferencePhotoScreen: { boutiqueDressId: string };
  TryOnResultScreen: { jobId: string; boutiqueDressId: string };
  BookAppointmentScreen: { boutiqueId: string; boutiqueDressId?: string };
};

export type SavedStackParamList = {
  SavedScreen: undefined;
  DressDetailScreen: { boutiqueDressId: string };
  BoutiqueProfileScreen: { boutiqueId: string };
  CompareScreen: { boutiqueDressIds: string[] };
  TryOnCollectionScreen: undefined;
  TryOnScreen: { boutiqueDressId: string };
  ReferencePhotoScreen: { boutiqueDressId: string };
  TryOnResultScreen: { jobId: string; boutiqueDressId: string };
  BookAppointmentScreen: { boutiqueId: string; boutiqueDressId?: string };
  SavedBoutiquesScreen: undefined;
};

export type SearchStackParamList = {
  SearchScreen: undefined;
  DressDetailScreen: { boutiqueDressId: string };
  BoutiqueProfileScreen: { boutiqueId: string };
  BookAppointmentScreen: { boutiqueId: string; boutiqueDressId?: string };
};

// Legacy — kept until TryOn flow is fully migrated
export type TryOnStackParamList = {
  TryOnResultsScreen: undefined;
  TryOnResultDetailScreen: { jobId: string; dressId: string };
  DressDetailScreen: { dressId: string; fromSaved?: boolean };
};

export type MarketplaceStackParamList = {
  MarketplaceHomeScreen: undefined;
  CategoryListingScreen: { categoryId: string; categoryName: string };
  VendorListingScreen: { listingId: string };
};

export type AppTabParamList = {
  Home: undefined;
  Explore: undefined;
  Saved: undefined;
  Marketplace: undefined;
  Community: undefined;
};

export type ProfileStackParamList = {
  UserProfileScreen: undefined;
  ProfileScreen: undefined;
  GeneralInformationScreen: undefined;
  BridalDNAScreen: undefined;
  ShareYourStoryScreen: undefined;
  ShoppingPreferencesScreen: undefined;
  BuildYourMoodboardScreen: undefined;
  SettingsScreen: undefined;
  EditProfileScreen: undefined;
  PromoCodeScreen: undefined;
  AppointmentsScreen: undefined;
  SavedBoutiquesScreen: undefined;
  BoutiqueProfileScreen: { boutiqueId: string };
  BookAppointmentScreen: { boutiqueId: string; boutiqueDressId?: string };
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  ProfileStack: NavigatorScreenParams<ProfileStackParamList> | undefined;
  SearchStack: undefined;
  MessagesStack: NavigatorScreenParams<MessagesStackParamList> | undefined;
};
