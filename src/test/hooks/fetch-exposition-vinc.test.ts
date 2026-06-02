import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: { customer_code: '015892', address_code: '', id_cart: '0' },
}));

import { fetchExposition } from '@framework/acccount/fetch-account';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.clearAllMocks());

describe('fetchExposition — default (VINC) branch', () => {
  it('fetches the latest credit_exposure snapshot and maps it to Exposition', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          available: true,
          items: [
            {
              _id: 'e1',
              data: {
                currency: 'EUR',
                lines: [
                  { code: 'rimesse', scaduto: 10, da_scadere: 5, totale: 15 },
                ],
                totale_esposizione: 48,
                fido_assicurato: 50,
                differenza: 2,
              },
            },
          ],
          pagination: { page: 1, limit: 1, total: 3, totalPages: 3 },
        }),
      } as any;
    });

    const e = await fetchExposition('default');
    expect(calls[0]).toContain('/api/profile/credit_exposure');
    expect(calls[0]).toContain('relation_id=015892');
    expect(calls[0]).toContain('limit=1');
    expect(e.directRemittancesTotal).toBe(15);
    expect(e.total2Total).toBe(48);
    expect(e.trustAssuredTotal).toBe(50);
  });

  it('returns a zeroed Exposition when no snapshot is available', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ available: false, items: [] }),
    })) as any;
    const e = await fetchExposition('default');
    expect(e.total2Total).toBe(0);
    expect(e.differenceTotal).toBe(0);
  });
});
