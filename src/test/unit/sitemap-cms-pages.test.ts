import { describe, it, expect, vi, beforeEach } from 'vitest';

// The sitemap CMS-pages block maps each registry entry to URLs:
//   langs = p.lang ? [p.lang] : LANGUAGES   (served LANGUAGES = ['it','en'])
// then emits only for languages the sitemap serves. These tests exercise that
// mapping in isolation by mocking the registry (same style as
// cms-page-registry.test.ts) and stubbing the other, unrelated data sources to
// empty so only the CMS block contributes slug URLs.

const registryMock = vi.fn();

vi.mock('@/lib/db/cms-pages', () => ({
  getCachedCmsPageRegistry: () => registryMock(),
}));

// Force the local sitemap path: vcs returns no entries.
vi.mock('@/lib/vcs/seo', () => ({
  getSitemapData: vi.fn(async () => null),
  sitemapDataToRoutes: vi.fn(() => []),
}));

// Unrelated sources — return empty so they add no URLs.
vi.mock('@/lib/pim/server-fetch', () => ({
  fetchProductSkusForSitemap: vi.fn(async () => ({ skus: [], total: 0 })),
  serverFetchPimCategories: vi.fn(async () => []),
  serverFetchCollections: vi.fn(async () => []),
}));

vi.mock('@/utils/slugify', () => ({ slugify: (s: string) => s }));

import sitemap from '@/app/sitemap';

const SITE = 'https://shop.example.com';

/** URLs for a given slug across the two served languages. */
function slugUrls(entries: { url: string }[], slug: string): string[] {
  return entries
    .map((e) => e.url)
    .filter((u) => u === `${SITE}/it/${slug}` || u === `${SITE}/en/${slug}`)
    .sort();
}

describe('sitemap CMS pages per-language mapping', () => {
  beforeEach(() => {
    registryMock.mockReset();
    process.env.NEXT_PUBLIC_WEBSITE_URL = SITE;
  });

  it('a page with lang:it yields only the /it/<slug> URL', async () => {
    registryMock.mockResolvedValueOnce([
      { slug: 'contatti', title: 'Contatti', lang: 'it', show_in_nav: true },
    ]);
    const entries = await sitemap();
    expect(slugUrls(entries, 'contatti')).toEqual([`${SITE}/it/contatti`]);
  });

  it('a page with lang:de (not a served language) yields no URL', async () => {
    registryMock.mockResolvedValueOnce([
      { slug: 'kontakt', title: 'Kontakt', lang: 'de', show_in_nav: true },
    ]);
    const entries = await sitemap();
    expect(slugUrls(entries, 'kontakt')).toEqual([]);
  });

  it('a legacy page with no lang yields both /it/<slug> and /en/<slug>', async () => {
    registryMock.mockResolvedValueOnce([
      { slug: 'faq', title: 'FAQ', show_in_nav: true },
    ]);
    const entries = await sitemap();
    expect(slugUrls(entries, 'faq')).toEqual([
      `${SITE}/en/faq`,
      `${SITE}/it/faq`,
    ]);
  });
});
