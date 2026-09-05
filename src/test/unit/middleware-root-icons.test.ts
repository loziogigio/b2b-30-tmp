import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/seo/category-root-runtime', () => ({
  resolveCategoryRootMapForHost: vi.fn(async () => ({})),
  tenantHostFromRequest: () => 'b2b.example.com',
}));

import { middleware } from '../../../middleware';

const run = (pathname: string) =>
  middleware(new NextRequest(`https://b2b.example.com${pathname}`));

const passesThrough = (res: Response) =>
  res.status === 200 &&
  res.headers.get('x-middleware-next') === '1' &&
  res.headers.get('location') === null;

/**
 * The old bypass was `pathname.includes('icon') || pathname.includes('chrome')`.
 * It let real storefront URLs skip locale handling (a "silicone" slug landed in
 * `[lang]` as the language) and let every missing Apple touch-icon variant
 * render a full storefront page. Only the files we actually ship at the root
 * may pass through now; other root icon probes get a cheap 404.
 */
describe('middleware root icon handling', () => {
  it('locale-prefixes a product URL whose slug merely contains "icon"', async () => {
    const res = await run('/products/silicone-tube');
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe(
      'https://b2b.example.com/it/products/silicone-tube',
    );
  });

  it.each([
    '/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png',
    '/icons/manifest-icon-192.png',
    '/manifest.json',
  ])(
    'lets the shipped root file %s through to the static handler',
    async (pathname) => {
      expect(passesThrough(await run(pathname))).toBe(true);
    },
  );

  it.each([
    '/apple-touch-icon-120x120.png',
    '/apple-touch-icon-152x152-precomposed.png',
    '/android-chrome-192x192.png',
  ])(
    'answers a root icon variant we do not ship (%s) with a bare 404',
    async (pathname) => {
      const res = await run(pathname);
      expect(res.status).toBe(404);
      expect(res.headers.get('location')).toBeNull();
      expect(await res.text()).toBe('');
    },
  );

  it('still serves a localized product URL that contains "chrome"', async () => {
    expect(passesThrough(await run('/it/products/chrome-tap'))).toBe(true);
  });
});
