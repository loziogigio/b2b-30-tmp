export const fallbackLng = 'it';
export const languages = [fallbackLng, 'en', 'de', 'es', 'pt', 'fr'];
export const defaultNS = 'common';

export function resolveSupportedLang(lang: string | undefined | null): string {
  return lang && languages.includes(lang) ? lang : fallbackLng;
}

export function getOptions(lang = fallbackLng, ns = defaultNS) {
  return {
    // debug: true,
    supportedLngs: languages,
    fallbackLng,
    lng: lang,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
    initImmediate: false,
  };
}
