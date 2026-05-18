const BASE = process.env.EXPO_PUBLIC_BRIDEE_API_URL ?? '';

export const API = {
  users: {
    profile: () => `${BASE}/api/users/profile`,
    roles: () => `${BASE}/api/users/roles`,
    promo: () => `${BASE}/api/users/promo`,
  },
  boutiques: {
    detail: (id: string) => `${BASE}/api/boutiques/${id}`,
    slots: (id: string) => `${BASE}/api/boutiques/${id}/slots`,
    save: (id: string) => `${BASE}/api/boutiques/${id}/save`,
    saved: () => `${BASE}/api/boutiques/saved`,
  },
  dresses: {
    feed: () => `${BASE}/api/dresses/feed`,
    explore: () => `${BASE}/api/dresses/explore`,
    detail: (id: string) => `${BASE}/api/dresses/${id}`,
    similar: (id: string) => `${BASE}/api/dresses/similar/${id}`,
    search: () => `${BASE}/api/dresses/search`,
  },
  swipes: {
    record: () => `${BASE}/api/swipes`,
    saved: () => `${BASE}/api/swipes/saved`,
  },
  tryon: {
    referencePhotos: () => `${BASE}/api/tryon/reference-photos`,
    jobs: () => `${BASE}/api/tryon/jobs`,
    job: (id: string) => `${BASE}/api/tryon/jobs/${id}`,
  },
  appointments: {
    list: () => `${BASE}/api/appointments`,
    cancel: (id: string) => `${BASE}/api/appointments/${id}/cancel`,
  },
  conversations: {
    list: () => `${BASE}/api/conversations`,
    messages: (id: string) => `${BASE}/api/conversations/${id}/messages`,
    read: (id: string) => `${BASE}/api/conversations/${id}/read`,
  },
  marketplace: {
    categories: () => `${BASE}/api/marketplace/categories`,
    listings: () => `${BASE}/api/marketplace/listings`,
    listingDetail: (id: string) => `${BASE}/api/marketplace/listings/${id}`,
    listingSave: (id: string) => `${BASE}/api/marketplace/listings/${id}/save`,
    savedListings: () => `${BASE}/api/marketplace/saved`,
    vendor: (id: string) => `${BASE}/api/marketplace/vendors/${id}`,
  },
  search: {
    dresses: () => `${BASE}/api/dresses/search`,
  },
  admin: {},
} as const;
