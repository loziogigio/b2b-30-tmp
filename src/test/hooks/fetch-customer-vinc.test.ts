import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: { customer_code: '007959', vinc_customer_id: 'cust_X', address_code: '', id_cart: '0' },
}));

import { fetchCustomer } from '@framework/acccount/fetch-account';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.clearAllMocks());

describe('fetchCustomer — default (VINC) branch', () => {
  it('POSTs vinc_customer_id to /api/b2b/customer and returns the profile', async () => {
    const calls: string[] = [];
    let sentBody: any;
    global.fetch = vi.fn(async (url: any, init: any) => {
      calls.push(String(url));
      sentBody = JSON.parse(init?.body ?? '{}');
      return {
        ok: true,
        json: async () => ({
          success: true,
          customer: { code: '007959', businessName: 'ACME', vatNumber: 'IT1', isLegalEntity: true },
        }),
      } as any;
    }) as any;

    const c = await fetchCustomer('default');
    expect(calls[0]).toContain('/api/b2b/customer');
    expect(sentBody.customer_id).toBe('cust_X');
    expect(c.code).toBe('007959');
    expect(c.vatNumber).toBe('IT1');
  });
});
