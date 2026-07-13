import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vcs SEO endpoints are domain-aware; the client passes the request host and
// scopes Next cache tags by tenant. Mock both boundaries.
vi.mock('next/headers', () => ({
  headers: async () => new Map([['host', 'b2b.example.com']]),
}));
vi.mock('@/lib/cache/tags', () => ({
  currentTenantId: async () => 'tenant-a',
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import {
  DEFAULT_SEO_CONFIG,
  DEFAULT_ROBOTS,
  canonicalSiteUrl,
  categoryRootForLang,
  canonicalSiteUrl,
  normalizeSeoConfig,
  sitemapDataToRoutes,
  robotsConfigToRoute,
  resolveProduct,
  getSeoConfig,
  getSitemapData,
  type SeoConfig,
  type SitemapData,
} from '@/lib/vcs/seo';

beforeEach(() => {
  fetchMock.mockReset();
  process.env.VINC_SUITE_API_BASE = 'https://suite.example.com';
});

afterEach(() => {
  delete process.env.VINC_SUITE_API_BASE;
  delete process.env.PIM_API_URL_OVERRIDE;
});

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe('categoryRootForLang', () => {
  const cfg: SeoConfig = {
    categoryRoot: { default: 'categorie', it: 'prodotti' },
    robots: DEFAULT_ROBOTS,
  };
  it('prefers the per-locale root', () => {
    expect(categoryRootForLang(cfg, 'it')).toBe('prodotti');
  });
  it('falls back to default when locale missing', () => {
    expect(categoryRootForLang(cfg, 'en')).toBe('categorie');
  });
  it('falls back to categorie when nothing configured', () => {
    expect(
      categoryRootForLang({ categoryRoot: { default: '' } } as any, 'it'),
    ).toBe('categorie');
  });
});

describe('normalizeSeoConfig', () => {
  it('returns defaults for non-object input', () => {
    expect(normalizeSeoConfig(null)).toEqual(DEFAULT_SEO_CONFIG);
    expect(normalizeSeoConfig('nope')).toEqual(DEFAULT_SEO_CONFIG);
  });
  it('merges a default category root in', () => {
    const out = normalizeSeoConfig({ categoryRoot: { it: 'prodotti' } });
    expect(out.categoryRoot.default).toBe('categorie');
    expect(out.categoryRoot.it).toBe('prodotti');
  });
  it('keeps robots fields and fills missing ones from defaults', () => {
    const out = normalizeSeoConfig({ robots: { noindex: true } });
    expect(out.robots.noindex).toBe(true);
    expect(out.robots.disallow).toEqual(DEFAULT_ROBOTS.disallow);
  });
  it('normalizes the canonical site origin', () => {
    const out = normalizeSeoConfig({
      siteUrl: 'https://shop.example.com/path',
      channel: ' b2b ',
      robots: { sitemapUrl: 'https://other.example.com/sitemap.xml' },
    });
    expect(out.siteUrl).toBe('https://shop.example.com');
    expect(out.channel).toBe('b2b');
    expect(canonicalSiteUrl(out, 'http://localhost:3000')).toBe(
      'https://shop.example.com',
    );
  });
  it('can derive the canonical origin from an older sitemap URL payload', () => {
    expect(
      canonicalSiteUrl(
        normalizeSeoConfig({
          robots: { sitemapUrl: 'https://shop.example.com/sitemap.xml' },
        }),
        'http://localhost:3000',
      ),
    ).toBe('https://shop.example.com');
  });
});

describe('canonicalSiteUrl', () => {
  it('derives the tenant origin from the authoritative sitemap URL', () => {
    expect(
      canonicalSiteUrl({
        categoryRoot: { default: 'categorie' },
        robots: { sitemapUrl: 'https://shop.example.com/sitemap.xml' },
      }),
    ).toBe('https://shop.example.com');
  });

  it('falls back to the deployment URL when Suite does not advertise one', () => {
    expect(canonicalSiteUrl(DEFAULT_SEO_CONFIG, 'https://fallback.test/')).toBe(
      'https://fallback.test',
    );
  });
});

describe('sitemapDataToRoutes', () => {
  it('maps entries to absolute URLs with metadata', () => {
    const data: SitemapData = {
      baseUrl: 'https://b2b.example.com/',
      langs: ['it'],
      entries: [
        {
          loc: '/it/my-product',
          type: 'product',
          changefreq: 'weekly',
          priority: 0.6,
          lastmod: '2026-05-20T00:00:00.000Z',
        },
        { loc: 'it/prodotti/bagno', type: 'category' },
      ],
    };
    const out = sitemapDataToRoutes(data);
    expect(out[0].url).toBe('https://b2b.example.com/it/my-product');
    expect(out[0].changeFrequency).toBe('weekly');
    expect(out[0].priority).toBe(0.6);
    expect(out[0].lastModified).toEqual(new Date('2026-05-20T00:00:00.000Z'));
    // Leading slash normalized in
    expect(out[1].url).toBe('https://b2b.example.com/it/prodotti/bagno');
  });
  it('skips entries without a loc', () => {
    const out = sitemapDataToRoutes({
      baseUrl: 'https://x',
      langs: [],
      entries: [{ loc: '' } as any, { loc: '/it/a' }],
    });
    expect(out).toHaveLength(1);
  });
});

describe('robotsConfigToRoute', () => {
  it('emits Disallow:/ when noindex', () => {
    const out = robotsConfigToRoute({ noindex: true }, 'https://x/sitemap.xml');
    expect(out.rules).toEqual([{ userAgent: '*', disallow: '/' }]);
    expect(out.sitemap).toBe('https://x/sitemap.xml');
  });
  it('emits allow/disallow lists when indexable', () => {
    const out = robotsConfigToRoute(DEFAULT_ROBOTS, 'https://x/sitemap.xml');
    const rule = (out.rules as any[])[0];
    expect(rule.allow).toEqual(['/']);
    expect(rule.disallow).toContain('/api/');
    expect(rule.disallow).toContain('/*?preview=true');
  });
});

// ---------------------------------------------------------------------------
// Fetchers (HTTP boundary mocked)
// ---------------------------------------------------------------------------

describe('resolveProduct', () => {
  it('returns the resolved product on a found:true payload', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonRes({ found: true, sku: 'ABC123', slug: 'my-product' }),
    );
    const out = await resolveProduct('my-product', 'it');
    expect(out).toEqual({ found: true, sku: 'ABC123', slug: 'my-product' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/public/b2b/resolve-product');
    expect(url).toContain('slug=my-product');
    expect(url).toContain('lang=it');
    expect(init.headers['x-tenant-host']).toBe('b2b.example.com');
  });
  it('returns null on found:false', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ found: false }));
    expect(await resolveProduct('nope', 'it')).toBeNull();
  });
  it('returns null on a non-ok response (fallback)', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({}, 500));
    expect(await resolveProduct('x', 'it')).toBeNull();
  });
  it('returns null when vcs is unreachable (fallback)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));
    expect(await resolveProduct('x', 'it')).toBeNull();
  });
  it('returns null when base url not configured (no fetch)', async () => {
    delete process.env.VINC_SUITE_API_BASE;
    delete process.env.PIM_API_PRIVATE_URL;
    delete process.env.NEXT_PUBLIC_PIM_API_URL;
    expect(await resolveProduct('x', 'it')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getSeoConfig', () => {
  it('normalizes a vcs payload', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonRes({
        categoryRoot: { default: 'categorie', it: 'prodotti' },
        robots: { noindex: false, disallow: ['/api/'] },
      }),
    );
    const out = await getSeoConfig();
    expect(out.categoryRoot.it).toBe('prodotti');
    expect(out.robots.disallow).toEqual(['/api/']);
  });
  it('falls back to defaults on failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'));
    expect(await getSeoConfig()).toEqual(DEFAULT_SEO_CONFIG);
  });
});

describe('getSitemapData', () => {
  it('uses the local PIM override when no dedicated Suite base is set', async () => {
    delete process.env.VINC_SUITE_API_BASE;
    process.env.PIM_API_URL_OVERRIDE = 'http://localhost:3001';
    fetchMock.mockResolvedValueOnce(
      jsonRes({ baseUrl: 'https://x', langs: ['it'], entries: [] }),
    );

    await getSitemapData();

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:3001/api/public/b2b/sitemap-data',
    );
  });

  it('returns parsed data', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonRes({
        baseUrl: 'https://x',
        langs: ['it'],
        entries: [{ loc: '/it/a' }],
      }),
    );
    const out = await getSitemapData();
    expect(out?.entries).toHaveLength(1);
  });
  it('returns null on a malformed payload (fallback)', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes({ nope: true }));
    expect(await getSitemapData()).toBeNull();
  });
  it('returns null on failure (fallback to local generation)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'));
    expect(await getSitemapData()).toBeNull();
  });
});
