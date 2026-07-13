import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The flat `[slug]` route resolves a single segment in order:
 *   CMS page → vcs resolve-product → 404.
 * We mock every collaborator so the test asserts the *order* and the canonical
 * emission, not the heavy product render.
 */

const getCachedCmsPageMock = vi.fn();
const resolveProductMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('@/lib/db/cms-pages', () => ({
  getCachedCmsPage: (...a: any[]) => getCachedCmsPageMock(...a),
}));
vi.mock('@/lib/vcs/seo', () => ({
  resolveProduct: (...a: any[]) => resolveProductMock(...a),
  getSeoConfig: vi.fn(async () => ({
    siteUrl: 'https://b2b.example.com',
    channel: 'b2b',
    categoryRoot: { default: 'categorie', it: 'prodotti' },
    robots: {},
  })),
  canonicalSiteUrl: (config: any) => config.siteUrl,
  categoryRootForLang: (config: any, lang: string) =>
    config.categoryRoot[lang] || config.categoryRoot.default,
}));
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

// Product-render collaborators — stubbed so default-export rendering is inert.
vi.mock('@/components/blocks/CmsPageRenderer', () => ({
  CmsPageRenderer: () => null,
}));
vi.mock('@components/product/ProductDetailWithPreview', () => ({
  ProductDetailWithPreview: () => null,
}));
vi.mock('@/lib/db/product-templates', () => ({
  getProductDetailBlocks: vi.fn(async () => []),
}));
vi.mock('@/lib/db/product-templates-simple', () => ({
  getProductDetailBlocks: vi.fn(async () => []),
}));
vi.mock('@/lib/home-settings/fetch-server', () => ({
  getServerHomeSettings: vi.fn(async () => ({ branding: { title: 'Acme' } })),
}));
vi.mock('@/lib/seo/fetch-product', () => ({
  fetchProductForSeo: vi.fn(async () => ({
    name: 'My Product',
    slug: 'my-product',
  })),
}));
vi.mock('@/lib/pim/server-fetch', () => ({
  serverFetchPimProducts: vi.fn(async () => ({ results: [] })),
}));
vi.mock('@framework/product/get-pim-product', () => ({
  transformPimProducts: vi.fn(() => []),
}));

import FlatSlugPage, {
  generateMetadata,
} from '@/app/[lang]/(default)/[slug]/page';

const params = (slug: string) => Promise.resolve({ lang: 'it', slug });

beforeEach(() => {
  getCachedCmsPageMock.mockReset();
  resolveProductMock.mockReset();
  notFoundMock.mockClear();
  process.env.NEXT_PUBLIC_WEBSITE_URL = 'https://b2b.example.com';
});

describe('generateMetadata disambiguation', () => {
  it('CMS page wins — never calls resolve-product', async () => {
    getCachedCmsPageMock.mockResolvedValueOnce({
      name: 'FAQ',
      seo: { title: 'FAQ Title', description: 'desc' },
    });
    const meta = await generateMetadata({ params: params('faq') } as any);
    expect(meta.title).toBe('FAQ Title');
    expect(resolveProductMock).not.toHaveBeenCalled();
  });

  it('falls through to product when no CMS page; canonical = flat slug', async () => {
    getCachedCmsPageMock.mockResolvedValueOnce(null);
    resolveProductMock.mockResolvedValueOnce({
      found: true,
      sku: 'ABC123',
      slug: 'my-product',
      name: 'My Product',
    });
    const meta = await generateMetadata({
      params: params('my-product'),
    } as any);
    expect(resolveProductMock).toHaveBeenCalledWith('my-product', 'it');
    expect(meta.alternates?.canonical).toBe(
      'https://b2b.example.com/it/my-product',
    );
    expect(meta.title).toContain('ABC123');
  });

  it('returns empty metadata when neither resolves', async () => {
    getCachedCmsPageMock.mockResolvedValueOnce(null);
    resolveProductMock.mockResolvedValueOnce(null);
    const meta = await generateMetadata({ params: params('nope') } as any);
    expect(meta).toEqual({});
  });
});

describe('FlatSlugPage rendering decision', () => {
  it('renders CMS page first (no product resolve)', async () => {
    getCachedCmsPageMock.mockResolvedValueOnce({ blocks: [], name: 'FAQ' });
    await FlatSlugPage({ params: params('faq') } as any);
    expect(resolveProductMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it('renders the product when CMS misses but vcs resolves', async () => {
    getCachedCmsPageMock.mockResolvedValueOnce(null);
    resolveProductMock.mockResolvedValueOnce({
      found: true,
      sku: 'ABC123',
      slug: 'my-product',
    });
    await FlatSlugPage({ params: params('my-product') } as any);
    expect(resolveProductMock).toHaveBeenCalledWith('my-product', 'it');
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it('calls notFound when neither CMS nor product resolves', async () => {
    getCachedCmsPageMock.mockResolvedValueOnce(null);
    resolveProductMock.mockResolvedValueOnce(null);
    await expect(
      FlatSlugPage({ params: params('nope') } as any),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
