import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import vi from './locales/vi.json';

type Locale = 'en' | 'vi';

const STORAGE_KEY = 'bridee_language';

const translations: Record<Locale, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  vi: vi as Record<string, unknown>,
};

let currentLocale: Locale = 'vi';

function getDeviceLocale(): Locale {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.startsWith('vi') ? 'vi' : 'en';
  } catch {
    return 'vi';
  }
}

export async function initI18n(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'vi') {
      currentLocale = stored;
    } else {
      currentLocale = getDeviceLocale();
    }
  } catch {
    currentLocale = getDeviceLocale();
  }
}

export async function setLanguage(locale: Locale): Promise<void> {
  currentLocale = locale;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore storage error
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : path;
}

export function t(key: string): string {
  const dict = translations[currentLocale];
  const result = getNestedValue(dict, key);
  if (result === key && currentLocale !== 'en') {
    return getNestedValue(translations.en, key);
  }
  return result;
}
