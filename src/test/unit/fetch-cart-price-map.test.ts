import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchPimProductList = vi.hoisted(() => vi.fn());
vi.mock('@framework/product/get-pim-product', () => ({ fetchPimProductList }));
vi.mock('@utils/transform/inline-to-erp', () => ({
  productToErpPriceData: (p: any) =>
    p.priced ? { entity_code: p.id, net_price: 1 } : null,
}));

import {
  CART_CHECK_CHUNK,
  fetchCartPriceMap,
} from '@/lib/cart/fetch-cart-price-map';

beforeEach(() => {
  fetchPimProductList
    .mockReset()
    .mockImplementation(async ({ filters }: any) => ({
      items: filters.entity_code.map((id: string) => ({
        id,
        priced: id !== 'X',
      })),
      total: filters.entity_code.length,
    }));
});

describe('fetchCartPriceMap', () => {
  it('fetches every product, chunked at the search page cap', async () => {
    const codes = Array.from({ length: 150 }, (_, i) => `E${i}`);
    const map = await fetchCartPriceMap(codes);
    expect(fetchPimProductList).toHaveBeenCalledTimes(2);
    expect(fetchPimProductList.mock.calls[0][0]).toEqual({
      filters: { entity_code: codes.slice(0, CART_CHECK_CHUNK) },
      limit: 100,
    });
    expect(fetchPimProductList.mock.calls[1][0]).toEqual({
      filters: { entity_code: codes.slice(100) },
      limit: 50,
    });
    expect(Object.keys(map)).toHaveLength(150);
  });

  it('dedupes codes and leaves unpriced products out', async () => {
    const map = await fetchCartPriceMap(['E1', 'E1', 'X', '']);
    expect(fetchPimProductList).toHaveBeenCalledTimes(1);
    expect(fetchPimProductList).toHaveBeenCalledWith({
      filters: { entity_code: ['E1', 'X'] },
      limit: 2,
    });
    expect(Object.keys(map)).toEqual(['E1']);
  });

  it('fails when the search capped a page, instead of reading the missing products as not sellable', async () => {
    fetchPimProductList.mockImplementation(async ({ filters }: any) => ({
      items: filters.entity_code
        .slice(0, 1)
        .map((id: string) => ({ id, priced: true })),
      total: filters.entity_code.length,
    }));
    await expect(fetchCartPriceMap(['E1', 'E2'])).rejects.toThrow(
      /1 of 2 products/,
    );
  });

  it('accepts a page with fewer products than requested when the search found no more', async () => {
    // E2 is gone from the catalog: the search counts only what it found.
    fetchPimProductList.mockImplementation(async () => ({
      items: [{ id: 'E1', priced: true }],
      total: 1,
    }));
    const map = await fetchCartPriceMap(['E1', 'E2']);
    expect(Object.keys(map)).toEqual(['E1']);
  });
});
