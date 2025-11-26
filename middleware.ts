import { NextRequest, NextResponse } from 'next/server';
import acceptLanguage from 'accept-language';
import { fallbackLng, languages } from './app/i18n/settings';
import {
  PAGE_CONTEXT_COOKIE,
  PAGE_CONTEXT_COOKIE_MAX_AGE,
  buildContextFromParams,
  contextHasData,
  extractAttributesFromUserAgent,
  mergeContexts,
  parseContextCookie
} from '@/lib/page-context';

acceptLanguage.languages(languages);

export const config = {
  // Match all routes except API, static files, and Next.js internals
  matcher: [
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|assets|favicon.ico|sw.js|sitemap.xml|robots.txt).*)'
  ]
};

const LANGUAGE_COOKIE = 'i18next';
const CAMPAIGN_RESET_VALUES = new Set(['reset', 'default', 'none']);

const collectCampaignParams = (url: URL, detectedDevice?: string | undefined) => {
  const search = url.searchParams;
  const params: Record<string, string | undefined> = {
    campaign: search.get('campaign') ?? undefined,
    tag: search.get('tag') ?? undefined,
    homeTag: search.get('homeTag') ?? undefined,
    templateTag: search.get('templateTag') ?? undefined,
    segment: search.get('segment') ?? undefined,
    region: search.get('region') ?? undefined,
    language: search.get('language') ?? undefined,
    device: search.get('device') ?? detectedDevice
  };
  return params;
};

const applyCampaignPersistence = (req: NextRequest, res: NextResponse) => {
  const detected = extractAttributesFromUserAgent(req.headers.get('user-agent'));
  const params = collectCampaignParams(req.nextUrl, detected.device);
  const rawCampaign =
    params.campaign ?? params.tag ?? params.homeTag ?? params.templateTag ?? undefined;
  const campaignValue = rawCampaign?.trim().toLowerCase();

  if (campaignValue && CAMPAIGN_RESET_VALUES.has(campaignValue)) {
    res.cookies.delete(PAGE_CONTEXT_COOKIE);
    return res;
  }

  const urlContext = buildContextFromParams(params);
  const existingContext = parseContextCookie(req.cookies.get(PAGE_CONTEXT_COOKIE)?.value);

  if (urlContext) {
    const payload = mergeContexts(existingContext, {
      ...urlContext,
      landingPage: req.nextUrl.pathname,
      landedAt: new Date().toISOString(),
      source: 'url',
      utm: {
        source: req.nextUrl.searchParams.get('utm_source') ?? undefined,
        medium: req.nextUrl.searchParams.get('utm_medium') ?? undefined,
        campaign: req.nextUrl.searchParams.get('utm_campaign') ?? undefined,
        content: req.nextUrl.searchParams.get('utm_content') ?? undefined
      }
    });

    if (payload && contextHasData(payload)) {
      res.cookies.set(PAGE_CONTEXT_COOKIE, JSON.stringify(payload), {
        maxAge: PAGE_CONTEXT_COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax'
      });
    }
    return res;
  }

  if (existingContext && contextHasData(existingContext)) {
    // Refresh cookie to extend session lifetime
    res.cookies.set(PAGE_CONTEXT_COOKIE, JSON.stringify(existingContext), {
      maxAge: PAGE_CONTEXT_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax'
    });
  }

  return res;
};

export function middleware(req: NextRequest) {
  // Skip middleware for icon and chrome files
  if (req.nextUrl.pathname.includes('icon') || req.nextUrl.pathname.includes('chrome')) {
    return applyCampaignPersistence(req, NextResponse.next());
  }

  // Determine language from cookie, accept-language header, or fallback
  let lang: string | undefined;
  if (req.cookies.has(LANGUAGE_COOKIE)) {
    lang = acceptLanguage.get(req.cookies.get(LANGUAGE_COOKIE)?.value);
  }
  if (!lang) lang = acceptLanguage.get(req.headers.get('Accept-Language') ?? undefined);
  if (!lang) lang = fallbackLng;

  // Ensure we always have a valid language
  if (!languages.includes(lang)) {
    lang = fallbackLng;
  }

  const segments = req.nextUrl.pathname.split('/').filter(Boolean);
  // Check if URL already has a language prefix
  const hasLanguagePrefix = languages.some((loc) => req.nextUrl.pathname.startsWith(`/${loc}`));

  if (!hasLanguagePrefix && !req.nextUrl.pathname.startsWith('/_next')) {
    const normalizedSegments = segments.slice();
    if (normalizedSegments[0] === 'shop') {
      normalizedSegments[0] = 'search';
    }
    const normalizedPath =
      normalizedSegments.length > 0 ? `/${normalizedSegments.join('/')}` : '';

    const redirectUrl = new URL(`/${lang}${normalizedPath}${req.nextUrl.search}`, req.url);
    const response = NextResponse.redirect(redirectUrl, { status: 308 });

    // Set language cookie on redirect
    response.cookies.set(LANGUAGE_COOKIE, lang, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
      sameSite: 'lax'
    });

    return applyCampaignPersistence(req, response);
  }

  if (segments.length > 0 && languages.includes(segments[0])) {
    lang = segments[0];
  }

  // If the first path segment is not a supported language, fallback to default language
  if (segments.length > 0 && !languages.includes(segments[0]) && !req.nextUrl.pathname.includes('.')) {
    const normalizedLang = lang ?? fallbackLng;
    const pathname = `/${segments.join('/')}`;
    const redirectUrl = new URL(`/${normalizedLang}${pathname}${req.nextUrl.search}`, req.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(LANGUAGE_COOKIE, normalizedLang, {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax'
    });
    return applyCampaignPersistence(req, response);
  }

  // After ensuring the language prefix, normalize the pathname
  // Redirect legacy "/{lang}/shop" paths to the search page, preserving query params
  if (segments.length >= 2 && languages.includes(segments[0]) && segments[1] === 'shop') {
    const search = req.nextUrl.search;
    const redirectUrl = new URL(`/${segments[0]}/search${search}`, req.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(LANGUAGE_COOKIE, segments[0], {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax'
    });
    return applyCampaignPersistence(req, response);
  }

  const response = NextResponse.next();

  if (lang && languages.includes(lang)) {
    response.cookies.set(LANGUAGE_COOKIE, lang, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
      sameSite: 'lax'
    });
  }

  // Update language cookie based on referer if present
  if (req.headers.has('referer')) {
    try {
      const refererUrl = new URL(req.headers.get('referer') ?? '');
      const lngInReferer = languages.find((l) => refererUrl.pathname.startsWith(`/${l}`));
      if (lngInReferer) {
        response.cookies.set(LANGUAGE_COOKIE, lngInReferer, {
          maxAge: 365 * 24 * 60 * 60, // 1 year
          path: '/',
          sameSite: 'lax'
        });
      }
    } catch {
      // ignore malformed referer
    }
  }

  return applyCampaignPersistence(req, response);
}
