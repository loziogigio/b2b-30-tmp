import { describe, it, expect, afterEach } from 'vitest';
import { resolveErpUrl, erpSettingsCacheKey } from '@/lib/erp/factory';

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('resolveErpUrl', () => {
  it('prefers the override env var', () => {
    process.env.ERP_URL_OVERRIDE = 'http://u:p@local:1/x';
    process.env.ERP_URL = 'http://u:p@prod:1/x';
    expect(resolveErpUrl(undefined)).toBe('http://u:p@local:1/x');
  });

  it('falls back to tenant URL, then base env', () => {
    delete process.env.ERP_URL_OVERRIDE;
    process.env.ERP_URL = 'http://u:p@prod:1/x';
    expect(resolveErpUrl('http://u:p@tenant:1/x')).toBe(
      'http://u:p@tenant:1/x',
    );
    expect(resolveErpUrl(undefined)).toBe('http://u:p@prod:1/x');
  });

  it('throws when no URL is configured', () => {
    delete process.env.ERP_URL_OVERRIDE;
    delete process.env.ERP_URL;
    expect(() => resolveErpUrl(undefined)).toThrow(/ERP_URL/);
  });
});

describe('erpSettingsCacheKey', () => {
  // The key used to be `erp:settings:${csBaseUrl}` alone. Six tenants share
  // the cluster-internal `http://vinc-cs:3000`, so whichever of them warmed
  // the cache first served ITS erp_settings to all the others — labels,
  // packaging ids, the managed-substitutes/supplier flags and the erp_channel
  // promo filter all leaked across tenants.
  const CS = 'http://vinc-cs:3000';

  it('never collides between tenants sharing a Commerce Suite URL', () => {
    expect(erpSettingsCacheKey('bellieforti-com', CS)).not.toBe(
      erpSettingsCacheKey('baseprotection-com', CS),
    );
  });

  it('is stable for the same tenant and URL', () => {
    expect(erpSettingsCacheKey('dfl-it', CS)).toBe(
      erpSettingsCacheKey('dfl-it', CS),
    );
  });

  it('still separates one tenant reached via different Suite URLs', () => {
    expect(erpSettingsCacheKey('demo-it', CS)).not.toBe(
      erpSettingsCacheKey('demo-it', 'http://cs.vendereincloud.it'),
    );
  });

  it('includes the tenant id in the key', () => {
    expect(erpSettingsCacheKey('bellieforti-com', CS)).toContain(
      'bellieforti-com',
    );
  });

  it('keeps unresolved tenants apart rather than lumping them together', () => {
    expect(erpSettingsCacheKey('', CS)).not.toBe(
      erpSettingsCacheKey('bellieforti-com', CS),
    );
  });
});
