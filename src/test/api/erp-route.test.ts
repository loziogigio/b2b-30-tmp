import { describe, it, expect, vi } from 'vitest';

const getMultiplePrices = vi.fn();
vi.mock('@/lib/erp/factory', () => ({
  getMyMbErpClient: vi.fn(async () => ({ getMultiplePrices })),
}));

import { POST } from '@/app/api/erp/[...path]/route';
import { NextRequest } from 'next/server';

function req(path: string, body: unknown) {
  return new NextRequest(`http://localhost/api/erp/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/erp/[...path]', () => {
  it('dispatches get_multiple_prices and wraps the result in a success envelope', async () => {
    getMultiplePrices.mockResolvedValue({
      ART1: { entity_code: 'ART1', net_price: 9 },
    });
    const res = await POST(
      req('get_multiple_prices', {
        entity_codes: ['ART1'],
        quantity_list: [1],
        id_cart: '0',
        customer_code: 'C',
        address_code: 'A',
      }),
      { params: Promise.resolve({ path: ['get_multiple_prices'] }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('success');
    expect(json.data.ART1.net_price).toBe(9);
    expect(getMultiplePrices).toHaveBeenCalledWith(
      expect.objectContaining({
        customerCode: 'C',
        addressCode: 'A',
        entityCodes: ['ART1'],
        quantityList: [1],
        idCart: '0',
      }),
    );
  });

  it('returns 404 for an unknown endpoint', async () => {
    const res = await POST(req('nope', {}), {
      params: Promise.resolve({ path: ['nope'] }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 502 when the client throws', async () => {
    getMultiplePrices.mockRejectedValue(new Error('erp down'));
    const res = await POST(
      req('get_multiple_prices', {
        entity_codes: ['X'],
        customer_code: 'C',
        address_code: 'A',
      }),
      { params: Promise.resolve({ path: ['get_multiple_prices'] }) },
    );
    expect(res.status).toBe(502);
  });
});
