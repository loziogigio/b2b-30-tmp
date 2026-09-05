'use client';

import i18next from 'i18next';
import { useEffect, useRef, useLayoutEffect } from 'react';
import {
  initReactI18next,
  useTranslation as useTranslationOrg,
} from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { getOptions, resolveSupportedLang } from './settings';

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
    lng: runsOnServerSide ? undefined : getOptions().fallbackLng, // Use fallback language to match server render
    detection: {
      order: ['path', 'htmlTag', 'cookie', 'navigator'],
    },
    preload: runsOnServerSide ? getOptions().supportedLngs : [],
  });

export function useTranslation(lang: string, ns?: string, options?: object) {
  // Callers derive `lang` from the URL's first segment, which for an unknown
  // path is not a language at all ("/favicon.ico" → "favicon.ico"). Such a
  // value must never reach react-i18next: with Suspense enabled the hook
  // suspends on a resource bundle that can never load, the promise settles at
  // once, React retries, and the server render loops forever — pinning one
  // CPU core per request until the replica fails its healthcheck (2026-09-04).
  const safeLang = resolveSupportedLang(lang);

  // Bind `t` to the route language on the very first server and client render.
  // The shared i18next singleton can otherwise retain the language of another
  // concurrent SSR request, producing English HTML for an Italian URL (and a
  // hydration mismatch once the browser detector corrects it).
  const ret = useTranslationOrg(ns, { ...(options || {}), lng: safeLang });
  const { i18n } = ret;

  // Use a ref to track if we've initialized the language
  const initializedRef = useRef(false);

  // Use layoutEffect to change language before browser paint (avoids hydration mismatch)
  useIsomorphicLayoutEffect(() => {
    if (!initializedRef.current || i18n.resolvedLanguage !== safeLang) {
      i18n.changeLanguage(safeLang);
      initializedRef.current = true;
    }
  }, [safeLang, i18n]);

  return ret;
}
