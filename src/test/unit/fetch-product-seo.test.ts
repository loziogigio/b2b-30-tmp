import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: async () => new Map([['host', 'localhost:3005']]),
}));

vi.mock('@/lib/tenant', () => ({
  buildTenantApiHeaders: () => ({ 'content-type': 'application/json' }),
  resolveTenant: vi.fn(),
  isSingleTenant: true,
}));

vi.mock('@/lib/cache/tags', () => ({
  cacheTag: (name: string, tenant: string) => `${name}-${tenant}`,
  SINGLE_TENANT_ID: 'test-tenant',
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const jsonResponse = (results: unknown[]) =>
  new Response(
    JSON.stringify({ success: true, data: { results, numFound: results.length } }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

describe('fetchProductForSeo', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('falls back from exact SKU to parent_sku for grouped parent products', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            sku: 'AG0470',
            name: 'Piantatoio',
            variants: [{ sku: '603190', cover_image_url: 'https://img.test/a.jpg' }],
          },
        ]),
      );

    const { fetchProductForSeo } = await import('@/lib/seo/fetch-product');
    const product = await fetchProductForSeo('AG0470', 'it');

    expect(product).toMatchObject({
      sku: '603190',
      name: 'Piantatoio',
      cover_image_url: 'https://img.test/a.jpg',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).filters).toEqual({
      sku: ['AG0470'],
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).filters).toEqual({
      parent_sku: ['AG0470'],
    });
  });
});
