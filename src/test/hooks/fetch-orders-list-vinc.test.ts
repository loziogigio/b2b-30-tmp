import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchOrdersList } from '@framework/order/fetch-orders-list';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.restoreAllMocks());

const params = {
  date_from: '01052026', // DDMMYYYY
  date_to: '31052026',
  type: 'E' as const,
  customer_code: '015892',
  address_code: '',
};

describe('fetchOrdersList — default (VINC) branch', () => {
  it('calls /api/profile/historical_order with translated query and maps records', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          available: true,
          items: [
            { _id: 'X1', data: { document_number: 'OC/1', total: 10, status: 'fulfilled' } },
          ],
        }),
      } as any;
    });

    const res = await fetchOrdersList(params as any, 'default');

    expect(calls[0]).toContain('/api/profile/historical_order');
    expect(calls[0]).toContain('relation_id=015892');
    expect(calls[0]).toContain('status=fulfilled'); // plain status param (E); route adds filter[status]
    expect(calls[0]).toContain('2026-05-01'); // date_from translated to ISO
    expect(res).toHaveLength(1);
    expect(res[0].source).toBe('vinc');
    expect(res[0].document).toBe('OC/1');
  });

  it('returns [] when the model is unavailable', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ available: false, items: [] }),
    })) as any;
    const res = await fetchOrdersList(params as any, 'default');
    expect(res).toEqual([]);
  });

  it('drops a malformed/empty date instead of emitting a broken filter', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      return { ok: true, json: async () => ({ available: true, items: [] }) } as any;
    });
    await fetchOrdersList(
      { ...params, date_from: '', date_to: 'not-a-date' } as any,
      'default',
    );
    expect(calls[0]).not.toContain('date_from');
    expect(calls[0]).not.toContain('date_to');
  });

  it('does NOT hit /api/profile on the time theme (uses the ERP path)', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      // time theme posts to /api/erp/get_orders and expects { data: [...] }
      return { ok: true, json: async () => ({ data: [] }) } as any;
    });
    await fetchOrdersList(params as any, 'time');
    expect(calls.some((u) => u.includes('/api/profile/'))).toBe(false);
    expect(calls.some((u) => u.includes('/api/erp/'))).toBe(true);
  });
});
