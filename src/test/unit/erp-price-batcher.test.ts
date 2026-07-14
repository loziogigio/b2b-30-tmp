import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchErpPrices = vi.hoisted(() => vi.fn());
vi.mock('@framework/erp/prices', () => ({ fetchErpPrices }));

import {
  loadErpPrice,
  __resetErpPriceBatcher,
} from '@framework/pricing/erp-price-batcher';

const ctx = {
  quantity: 1,
  idCart: '0',
  customerCode: '5300',
  addressCode: '1',
  theme: 'time',
};

/** The ERP returns a map keyed by entity_code. */
const priceMapFor = (codes: string[]) =>
  Object.fromEntries(
    codes.map((c) => [c, { entity_code: c, net_price: Number(c) }]),
  );

beforeEach(() => {
  vi.useFakeTimers();
  __resetErpPriceBatcher();
  fetchErpPrices.mockReset();
  fetchErpPrices.mockImplementation(async ({ entity_codes }: any) =>
    priceMapFor(entity_codes),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('loadErpPrice — request coalescing', () => {
  it('sends ONE request for many codes enqueued in the same window', async () => {
    // The bug: a grid of N cards fired N get_multiple_prices requests.
    const results = Promise.all([
      loadErpPrice({ ...ctx, entityCode: '1' }),
      loadErpPrice({ ...ctx, entityCode: '2' }),
      loadErpPrice({ ...ctx, entityCode: '3' }),
    ]);

    await vi.runAllTimersAsync();
    const prices = await results;

    expect(fetchErpPrices).toHaveBeenCalledTimes(1);
    expect(fetchErpPrices.mock.calls[0][0].entity_codes).toEqual([
      '1',
      '2',
      '3',
    ]);
    // Each caller still gets its OWN slice back.
    expect(prices.map((p) => p?.entity_code)).toEqual(['1', '2', '3']);
  });

  it('dedupes a code requested by two cards, but resolves both', async () => {
    const results = Promise.all([
      loadErpPrice({ ...ctx, entityCode: '7' }),
      loadErpPrice({ ...ctx, entityCode: '7' }),
      loadErpPrice({ ...ctx, entityCode: '8' }),
    ]);

    await vi.runAllTimersAsync();
    const prices = await results;

    expect(fetchErpPrices).toHaveBeenCalledTimes(1);
    expect(fetchErpPrices.mock.calls[0][0].entity_codes).toEqual(['7', '8']);
    expect(prices.map((p) => p?.entity_code)).toEqual(['7', '7', '8']);
  });

  it('resolves undefined for a code the ERP did not price (not an error)', async () => {
    fetchErpPrices.mockResolvedValueOnce(priceMapFor(['1']));

    const results = Promise.all([
      loadErpPrice({ ...ctx, entityCode: '1' }),
      loadErpPrice({ ...ctx, entityCode: '99' }),
    ]);
    await vi.runAllTimersAsync();
    const [a, b] = await results;

    expect(a?.entity_code).toBe('1');
    expect(b).toBeUndefined();
  });

  it('starts a NEW batch for codes enqueued after the window closed', async () => {
    const first = loadErpPrice({ ...ctx, entityCode: '1' });
    await vi.runAllTimersAsync();
    await first;

    const second = loadErpPrice({ ...ctx, entityCode: '2' });
    await vi.runAllTimersAsync();
    await second;

    expect(fetchErpPrices).toHaveBeenCalledTimes(2);
  });

  it('does not mix different ERP customer contexts into one request', async () => {
    const results = Promise.all([
      loadErpPrice({ ...ctx, entityCode: '1' }),
      loadErpPrice({ ...ctx, entityCode: '2', addressCode: '9' }),
    ]);
    await vi.runAllTimersAsync();
    await results;

    expect(fetchErpPrices).toHaveBeenCalledTimes(2);
    const sent = fetchErpPrices.mock.calls.map((c: any) => c[0].address_code);
    expect(new Set(sent)).toEqual(new Set(['1', '9']));
  });

  it('chunks a very large batch instead of one unbounded request', async () => {
    const codes = Array.from({ length: 120 }, (_, i) => String(i));
    const results = Promise.all(
      codes.map((entityCode) => loadErpPrice({ ...ctx, entityCode })),
    );
    await vi.runAllTimersAsync();
    const prices = await results;

    // 120 codes at MAX_BATCH_SIZE 50 → 3 requests, not 120.
    expect(fetchErpPrices).toHaveBeenCalledTimes(3);
    expect(prices).toHaveLength(120);
    expect(prices.every((p) => p !== undefined)).toBe(true);
  });

  it('rejects the waiters of a failed batch', async () => {
    fetchErpPrices.mockRejectedValueOnce(new Error('ERP down'));

    // Attach the rejection handler BEFORE advancing timers, or the rejection
    // lands with no handler attached and surfaces as an unhandled rejection.
    const assertion = expect(
      loadErpPrice({ ...ctx, entityCode: '1' }),
    ).rejects.toThrow('ERP down');

    await vi.runAllTimersAsync();
    await assertion;
  });
});
