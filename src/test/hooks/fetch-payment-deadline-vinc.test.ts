import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: { customer_code: '015892', vinc_customer_id: 'cust_X', address_code: '', id_cart: '0' },
}));

import { fetchPaymentDeadline } from '@framework/acccount/fetch-account';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.clearAllMocks());

describe('fetchPaymentDeadline — default (VINC) branch', () => {
  it('fetches payment_schedule and maps to header/detail rows + totals', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          available: true,
          items: [
            {
              _id: 'a',
              data: {
                data_scadenza: '2026-12-31T00:00:00Z',
                tipo_label: 'Bonifico',
                tipo_code: 'C3',
                importo: 100,
                residuo: 100,
                valuta: 'EUR',
                documento: { numero_documento: 'F/2026/54', data_documento: '2026-01-02T00:00:00Z' },
              },
            },
          ],
        }),
      } as any;
    });

    const s = await fetchPaymentDeadline('default');
    expect(calls[0]).toContain('/api/profile/payment_schedule');
    expect(calls[0]).toContain('relation_id=015892');
    expect(s.items).toHaveLength(2); // header + detail
    expect(s.items[0].isDueView).toBe(true);
    expect(s.items[0].description).toBe('Bonifico');
    expect(s.items[1].isReferenceView).toBe(true);
    expect(s.items[1].document).toBe('F/2026/54');
    expect(s.totalGeneral).toBe(100);
  });

  it('returns an empty summary when unavailable', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ available: false, items: [] }),
    })) as any;
    const s = await fetchPaymentDeadline('default');
    expect(s.items).toEqual([]);
    expect(s.totalGeneral).toBe(0);
  });
});
