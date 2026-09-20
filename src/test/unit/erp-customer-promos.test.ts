import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCustomerPromos: vi.fn(),
  cachedJson: vi.fn(
    async (_k: string, _o: unknown, producer: () => Promise<unknown>) =>
      producer(),
  ),
  delByPrefix: vi.fn(async (_prefix: string) => undefined),
}));

vi.mock('@/lib/cache/redis-cache', () => ({
  cachedJson: mocks.cachedJson,
  delByPrefix: mocks.delByPrefix,
}));
vi.mock('@/lib/erp/factory', () => ({
  getMyMbErpClient: vi.fn(async () => ({
    getCustomerPromos: mocks.getCustomerPromos,
  })),
}));

import {
  entitlementCacheKey,
  getEntitledPromoCodes,
  purgePromoEntitlement,
} from '@/lib/erp/customer-promos';

const ARGS = {
  req: {} as any, // only forwarded to the (mocked) factory
  tenantId: 'vinc-bellieforti-com',
  customerCode: '10407',
  addressCode: '1',
};

describe('entitlementCacheKey', () => {
  it('includes the tenant id', () => {
    // Six tenants share one internal CS URL; a tenant-less ERP cache key has
    // already leaked one tenant's data to the others in production.
    const key = entitlementCacheKey('vinc-bellieforti-com', '10407', '1');
    expect(key).toContain('vinc-bellieforti-com');
    expect(key).toContain('10407');
    expect(key).toContain('1');
    expect(key).not.toBe(entitlementCacheKey('vinc-hidros-it', '10407', '1'));
  });
});

describe('getEntitledPromoCodes', () => {
  beforeEach(() => {
    mocks.getCustomerPromos.mockReset();
    mocks.cachedJson.mockClear();
  });

  it('returns the set of entitled codes', async () => {
    mocks.getCustomerPromos.mockResolvedValue([
      { code: '26-FUORI TUTTO' },
      { code: '26-SETTEMBRE' },
      { code: 'IMPMIN' },
    ]);
    const set = await getEntitledPromoCodes(ARGS);
    expect(set).toEqual(new Set(['26-FUORI TUTTO', '26-SETTEMBRE', 'IMPMIN']));
  });

  it('returns null when the ERP could not answer, so callers fail open', async () => {
    mocks.getCustomerPromos.mockResolvedValue(null);
    expect(await getEntitledPromoCodes(ARGS)).toBeNull();
  });

  it('returns an EMPTY set — not null — for a customer entitled to nothing', async () => {
    mocks.getCustomerPromos.mockResolvedValue([]);
    const set = await getEntitledPromoCodes(ARGS);
    expect(set).not.toBeNull();
    expect(set!.size).toBe(0);
  });

  it('never lets a thrown error escape', async () => {
    mocks.getCustomerPromos.mockRejectedValue(new Error('boom'));
    expect(await getEntitledPromoCodes(ARGS)).toBeNull();
  });

  it('goes through the cache with a 6h soft TTL', async () => {
    mocks.getCustomerPromos.mockResolvedValue([]);
    await getEntitledPromoCodes(ARGS);
    expect(mocks.cachedJson).toHaveBeenCalledTimes(1);
    expect(mocks.cachedJson.mock.calls[0][1]).toMatchObject({
      softTtlMs: 6 * 60 * 60 * 1000,
    });
  });

  it('does not call the ERP without a complete customer/address pair', async () => {
    expect(
      await getEntitledPromoCodes({ ...ARGS, addressCode: '' }),
    ).toBeNull();
    expect(mocks.getCustomerPromos).not.toHaveBeenCalled();
  });
});

describe('getEntitledPromoCodes — an unknown must never be cached', () => {
  it('makes the cache producer REJECT on null, so cachedJson writes nothing', async () => {
    // cachedJson persists whatever the producer returns; a cached null would
    // fail open for the whole soft TTL after one ERP blip.
    mocks.getCustomerPromos.mockResolvedValue(null);
    let producer: (() => Promise<unknown>) | undefined;
    mocks.cachedJson.mockImplementationOnce(
      async (_k: string, _o: unknown, p: () => Promise<unknown>) => {
        producer = p;
        return p();
      },
    );
    expect(await getEntitledPromoCodes(ARGS)).toBeNull();
    await expect(producer!()).rejects.toThrow(/unknown/);
  });
});

describe('purgePromoEntitlement — a login must drop every address of the customer', () => {
  beforeEach(() => {
    mocks.delByPrefix.mockReset();
    mocks.delByPrefix.mockResolvedValue(undefined);
  });

  it('deletes by the customer prefix, closed with a colon so 5687 never sweeps 56870', async () => {
    await purgePromoEntitlement('bellieforti-com', '5687');
    expect(mocks.delByPrefix).toHaveBeenCalledTimes(1);
    expect(mocks.delByPrefix).toHaveBeenCalledWith(
      'promo-entitlement:bellieforti-com:5687:',
    );
  });

  it('resolves even when Redis rejects — a cache hiccup must never fail a login', async () => {
    mocks.delByPrefix.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(
      purgePromoEntitlement('bellieforti-com', '5687'),
    ).resolves.toBeUndefined();
  });

  it('does nothing without a complete tenant/customer pair', async () => {
    await purgePromoEntitlement('', '5687');
    await purgePromoEntitlement('bellieforti-com', '');
    expect(mocks.delByPrefix).not.toHaveBeenCalled();
  });
});
