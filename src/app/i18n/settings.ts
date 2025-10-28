export const fallbackLng = 'it';
export const languages = [fallbackLng, 'en', 'de', 'es', 'ar', 'he', 'zh'];
export const defaultNS = 'common';

export function getOptions(lang = fallbackLng, ns = defaultNS) {
  return {
    // debug: true,
    supportedLngs: languages,
    fallbackLng,
    lang,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
    initImmediate: false,
  };
}
