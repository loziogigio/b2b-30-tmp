import { describe, it, expect, vi, beforeEach } from 'vitest';

// The sitemap CMS-pages block maps each registry entry to URLs:
//   langs = p.lang ? [p.lang] : LANGUAGES   (served LANGUAGES = ['it','en'])
// then emits only for languages the sitemap serves. These tests exercise that
// mapping in isolation by mocking the registry (same style as
// cms-page-registry.test.ts) and stubbing the other, unrelated data sources to
// empty so only the CMS block contributes slug URLs.

const registryMock = vi.fn();
const productSkusMock = vi.fn();
const categoriesMock = vi.fn();
const seoConfigMock = vi.fn();
const sitemapDataMock = vi.fn();

vi.mock('@/lib/db/cms-pages', () => ({
  getCachedCmsPageRegistry: () => registryMock(),
}));

// Tests default to the local fallback; individual cases can return an
// authoritative (including intentionally empty) Suite sitemap.
vi.mock('@/lib/vcs/seo', () => ({
  getSitemapData: () => sitemapDataMock(),
  sitemapDataToRoutes: vi.fn(() => []),
  getSeoConfig: () => seoConfigMock(),
  canonicalSiteUrl: (config: any) =>
    config.siteUrl || process.env.NEXT_PUBLIC_WEBSITE_URL || '',
  categoryRootForLang: (config: any, lang: string) =>
    config.categoryRoot[lang] || config.categoryRoot.default,
}));

// Unrelated sources — return empty so they add no URLs.
vi.mock('@/lib/pim/server-fetch', () => ({
  fetchProductSkusForSitemap: (...args: any[]) => productSkusMock(...args),
  serverFetchPimCategories: (...args: any[]) => categoriesMock(...args),
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
    productSkusMock.mockReset();
    categoriesMock.mockReset();
    seoConfigMock.mockReset();
    sitemapDataMock.mockReset();
    sitemapDataMock.mockResolvedValue(null);
    productSkusMock.mockResolvedValue({ skus: [], total: 0 });
    categoriesMock.mockResolvedValue([]);
    seoConfigMock.mockResolvedValue({
      categoryRoot: { default: 'categorie' },
      robots: {},
    });
    process.env.NEXT_PUBLIC_WEBSITE_URL = SITE;
  });

  it('keeps an authoritative empty Suite sitemap empty', async () => {
    sitemapDataMock.mockResolvedValueOnce({
      baseUrl: SITE,
      langs: [],
      entries: [],
    });

    expect(await sitemap()).toEqual([]);
    expect(registryMock).not.toHaveBeenCalled();
    expect(productSkusMock).not.toHaveBeenCalled();
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

describe('local sitemap route contract', () => {
  beforeEach(() => {
    registryMock.mockReset();
    productSkusMock.mockReset();
    categoriesMock.mockReset();
    seoConfigMock.mockReset();
    sitemapDataMock.mockReset();
    sitemapDataMock.mockResolvedValue(null);
    registryMock.mockResolvedValue([]);
    productSkusMock.mockResolvedValue({ skus: ['PO 27/011'], total: 1 });
    categoriesMock.mockResolvedValue([
      {
        category_id: 'root',
        slug: 'root',
        children: [
          {
            category_id: 'lights',
            slug: 'lampade led',
            children: [],
          },
        ],
      },
    ]);
    seoConfigMock.mockResolvedValue({
      categoryRoot: { default: 'categorie', it: 'prodotti', en: 'products' },
      robots: {},
    });
    process.env.NEXT_PUBLIC_WEBSITE_URL = SITE;
  });

  it('uses custom category roots and flat encoded SKU fallbacks', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain(`${SITE}/it/prodotti`);
    expect(urls).toContain(`${SITE}/it/prodotti/lampade%20led`);
    expect(urls).toContain(`${SITE}/en/products/lampade%20led`);
    expect(urls).toContain(`${SITE}/it/PO%2027%2F011`);
    expect(urls).not.toContain(`${SITE}/it/products/PO%2027%2F011`);
  });

  it('omits the catalogue index when the tree is a lone dead placeholder', async () => {
    // bellieforti's shape: one placeholder root, no ERP code, no children.
    // Listing it would feed search engines an index page with nothing on it.
    categoriesMock.mockResolvedValue([
      {
        category_id: '0',
        name: 'Prodotti',
        slug: 'prodotti-0',
        external_code: null,
        product_count: 0,
        children: [],
      },
    ]);

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).not.toContain(`${SITE}/it/prodotti`);
    expect(urls).not.toContain(`${SITE}/it/prodotti/prodotti-0`);
    // Unrelated routes still listed.
    expect(urls).toContain(`${SITE}/it/search`);
  });

  it('paginates the fallback catalog in contiguous 100-row search pages', async () => {
    productSkusMock
      .mockResolvedValueOnce({ skus: ['SKU-0'], total: 201 })
      .mockResolvedValueOnce({ skus: ['SKU-100'], total: 201 })
      .mockResolvedValueOnce({ skus: ['SKU-200'], total: 201 });

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(productSkusMock.mock.calls).toEqual([
      [0, 100],
      [100, 100],
      [200, 100],
    ]);
    expect(urls).toContain(`${SITE}/it/SKU-200`);
  });
});
