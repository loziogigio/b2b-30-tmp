import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const pimPost = vi.hoisted(() => vi.fn());
const pimPatch = vi.hoisted(() => vi.fn());
vi.mock('@framework/utils/httpPIM', () => ({
  get: vi.fn(),
  post: pimPost,
  patch: pimPatch,
  del: vi.fn(),
}));
vi.mock('@/lib/auth', async (orig) => ({
  ...(await orig<typeof import('@/lib/auth')>()),
  getAuthToken: () => 'tok',
}));

import {
  addCartLine,
  patchCartLines,
  removeCartLines,
} from '@framework/cart/b2b-cart';

const realFetch = global.fetch;
beforeEach(() => {
  pimPost.mockReset().mockResolvedValue({ success: true });
  pimPatch.mockReset().mockResolvedValue({ success: true });
});
afterEach(() => {
  global.fetch = realFetch;
});

describe('cart line helpers', () => {
  it('patches lines through the CS items endpoint', async () => {
    await patchCartLines('O1', [
      { line_number: 10, unit_price: 7.5, list_price: 20 },
    ]);
    expect(pimPatch).toHaveBeenCalledWith('api/b2b/orders/O1/items', {
      items: [{ line_number: 10, unit_price: 7.5, list_price: 20 }],
    });
  });

  it('removes lines through the dedicated route and throws on failure', async () => {
    const fetchMock = vi.fn(
      async () => new Response('{"ok":true}', { status: 200 }),
    );
    global.fetch = fetchMock as any;
    await removeCartLines('O1', { line_numbers: [10, 20] });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/b2b/cart/remove-items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ order_id: 'O1', line_numbers: [10, 20] }),
      }),
    );

    global.fetch = (async () => new Response('no', { status: 500 })) as any;
    await expect(removeCartLines('O1', { line_numbers: [10] })).rejects.toThrow(
      'Remove items failed: 500',
    );
  });

  it('adds a line from a booking payload', async () => {
    await addCartLine('O1', {
      item_id: 'E1',
      quantity: 12,
      price: 20,
      price_discount: 7.5,
      promo_code: 0,
      promo_row: 0,
    });
    expect(pimPost).toHaveBeenCalledWith(
      'api/b2b/orders/O1/items',
      expect.objectContaining({
        entity_code: 'E1',
        quantity: 12,
        unit_price: 7.5,
        list_price: 20,
        promo_code: undefined,
      }),
    );
  });
});
