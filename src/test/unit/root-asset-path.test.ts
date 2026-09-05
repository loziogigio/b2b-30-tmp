import { describe, expect, it } from 'vitest';
import {
  isRootStaticAsset,
  isUnservedIconProbe,
} from '@/lib/routing/root-asset-path';

/**
 * Browsers and crawlers request icon files at the site root with no locale
 * prefix. The middleware used to let ANY path containing "icon" or "chrome"
 * skip locale and tenant handling; the allowlist below is exact instead.
 */
describe('isRootStaticAsset', () => {
  it.each([
    '/favicon.ico',
    '/favicon.svg',
    '/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png',
    '/manifest.json',
    '/icons/apple-icon-180.png',
    '/icons/manifest-icon-192.png',
  ])('recognises the served root file %s', (pathname) => {
    expect(isRootStaticAsset(pathname)).toBe(true);
  });

  it.each([
    '/products/silicone-tube',
    '/it/products/chrome-tap',
    '/apple-touch-icon-120x120.png',
    '/favicon-32x32.png',
    '/iconset/logo.png',
    '/icons',
  ])('does not match the storefront or unknown path %s', (pathname) => {
    expect(isRootStaticAsset(pathname)).toBe(false);
  });
});

describe('isUnservedIconProbe', () => {
  it.each([
    '/apple-touch-icon-120x120.png',
    '/apple-touch-icon-152x152-precomposed.png',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/android-chrome-192x192.png',
    '/mstile-150x150.png',
  ])('flags the root icon variant we do not ship: %s', (pathname) => {
    expect(isUnservedIconProbe(pathname)).toBe(true);
  });

  it.each([
    '/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png',
    '/favicon.ico',
    '/favicon.svg',
    '/icons/apple-icon-180.png',
    '/products/icon-set',
    '/it/products/silicone-tube',
    '/it/apple-touch-icon.png',
  ])('leaves %s alone', (pathname) => {
    expect(isUnservedIconProbe(pathname)).toBe(false);
  });
});
