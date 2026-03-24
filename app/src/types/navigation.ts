export type AuthStackParamList = {
  AuthScreen: undefined;
};

export type SavedStackParamList = {
  SavedScreen: undefined;
  DressDetailScreen: { dressId: string };
  TryOnInstructionScreen: { dressId: string; tryOnPhotoPath: string };
};

export type TryOnStackParamList = {
  TryOnResultsScreen: undefined;
  TryOnResultDetailScreen: { jobId: string; dressId: string };
  DressDetailScreen: { dressId: string };
};

export type AppTabParamList = {
  Discover: undefined;
  Saved: undefined;
  TryOn: undefined;
  Marketplace: undefined;
  Community: undefined;
  Messages: undefined;
};
