'use client';

import i18next from 'i18next';
import { useEffect, useRef, useLayoutEffect } from 'react';
import {
  initReactI18next,
  useTranslation as useTranslationOrg,
} from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { getOptions } from './settings';

const runsOnServerSide = typeof window === 'undefined';
const useIsomorphicLayoutEffect = runsOnServerSide
  ? useEffect
  : useLayoutEffect;

// on client side the normal singleton is ok
i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`),
    ),
  )
  .init({
    ...getOptions(),
    lng: runsOnServerSide ? undefined : getOptions().fallbackLng?.[0], // Use fallback language to match server render
    detection: {
      order: ['path', 'htmlTag', 'cookie', 'navigator'],
    },
    preload: runsOnServerSide ? getOptions().supportedLngs : [],
  });

export function useTranslation(lang: string, ns?: string, options?: object) {
  const ret = useTranslationOrg(ns, options);
  const { i18n } = ret;

  // Use a ref to track if we've initialized the language
  const initializedRef = useRef(false);

  // Use layoutEffect to change language before browser paint (avoids hydration mismatch)
  useIsomorphicLayoutEffect(() => {
    if (!initializedRef.current || i18n.resolvedLanguage !== lang) {
      i18n.changeLanguage(lang);
      initializedRef.current = true;
    }
  }, [lang, i18n]);

  return ret;
}
