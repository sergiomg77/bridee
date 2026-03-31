export type AuthStackParamList = {
  AuthScreen: undefined;
};

export type SavedStackParamList = {
  SavedScreen: undefined;
  DressDetailScreen: { dressId: string; fromSaved?: boolean };
  TryOnInstructionScreen: { dressId: string; tryOnPhotoPath: string };
};

export type TryOnStackParamList = {
  TryOnResultsScreen: undefined;
  TryOnResultDetailScreen: { jobId: string; dressId: string };
  DressDetailScreen: { dressId: string; fromSaved?: boolean };
};

export type AppTabParamList = {
  Discover: undefined;
  Saved: undefined;
  TryOn: undefined;
  Marketplace: undefined;
  Community: undefined;
  Messages: undefined;
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
