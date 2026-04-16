import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, resolveDeviceLanguage, SUPPORTED_LANGUAGES } from '@/i18n/locale';
import { defaultNS, resources } from '@/i18n/resources';

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  defaultNS,
  lng: resolveDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
