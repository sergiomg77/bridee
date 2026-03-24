export type AuthStackParamList = {
  AuthScreen: undefined;
};

export type SavedStackParamList = {
  SavedScreen: undefined;
  DressDetailScreen: { dressId: string };
  TryOnInstructionScreen: { dressId: string; tryOnPhotoPath: string };
};

export type AppTabParamList = {
  Discover: undefined;
  Saved: undefined;
  Marketplace: undefined;
  Community: undefined;
  Messages: undefined;
};
