export type AuthStackParamList = {
  AuthScreen: undefined;
};

export type DiscoverStackParamList = {
  DiscoverScreen: undefined;
  DressDetailScreen: { boutiqueDressId: string };
  BoutiqueProfileScreen: { boutiqueId: string };
  TryOnInstructionScreen: { dressId: string; tryOnPhotoPath: string };
};

export type ExploreStackParamList = {
  ExploreScreen: undefined;
  DressDetailScreen: { boutiqueDressId: string };
  BoutiqueProfileScreen: { boutiqueId: string };
  TryOnInstructionScreen: { dressId: string; tryOnPhotoPath: string };
};

export type SavedStackParamList = {
  SavedScreen: undefined;
  DressDetailScreen: { boutiqueDressId: string };
  BoutiqueProfileScreen: { boutiqueId: string };
  TryOnInstructionScreen: { dressId: string; tryOnPhotoPath: string };
  TryOnResultsScreen: undefined;
  TryOnResultDetailScreen: { jobId: string; boutiqueDressId: string };
  CompareScreen: { boutiqueDressIds: string[] };
};

export type TryOnStackParamList = {
  TryOnResultsScreen: undefined;
  TryOnResultDetailScreen: { jobId: string; boutiqueDressId: string };
  DressDetailScreen: { boutiqueDressId: string };
};

export type AppTabParamList = {
  Home: undefined;
  Explore: undefined;
  Saved: undefined;
  Marketplace: undefined;
  Community: undefined;
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  GeneralInformationScreen: undefined;
  BridalDNAScreen: undefined;
  ShareYourStoryScreen: undefined;
  ShoppingPreferencesScreen: undefined;
  BuildYourMoodboardScreen: undefined;
  SettingsScreen: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ProfileStack: undefined;
};
