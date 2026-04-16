import { getLocales } from 'expo-localization';

import type { AppLanguage } from '@/i18n/resources';

const SUPPORTED_LANGUAGES: AppLanguage[] = ['en', 'es'];
const DEFAULT_LANGUAGE: AppLanguage = 'es';

function normalizeLanguageTag(languageTag: string | null | undefined) {
  if (!languageTag) {
    return null;
  }

  const normalizedTag = languageTag.toLowerCase();
  const [languageCode] = normalizedTag.split(/[-_]/);

  return languageCode ?? null;
}

export function resolveDeviceLanguage(): AppLanguage {
  const locale = getLocales()[0];
  const normalizedLanguage = normalizeLanguageTag(locale?.languageCode ?? locale?.languageTag);

  if (normalizedLanguage && SUPPORTED_LANGUAGES.includes(normalizedLanguage as AppLanguage)) {
    return normalizedLanguage as AppLanguage;
  }

  return DEFAULT_LANGUAGE;
}

export { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES };
