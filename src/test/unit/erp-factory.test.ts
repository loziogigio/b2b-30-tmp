import { describe, it, expect, afterEach } from 'vitest';
import { resolveErpUrl } from '@/lib/erp/factory';

const ORIGINAL = { ...process.env };
afterEach(() => { process.env = { ...ORIGINAL }; });

describe('resolveErpUrl', () => {
  it('prefers the override env var', () => {
    process.env.ERP_URL_OVERRIDE = 'http://u:p@local:1/x';
    process.env.ERP_URL = 'http://u:p@prod:1/x';
    expect(resolveErpUrl(undefined)).toBe('http://u:p@local:1/x');
  });

  it('falls back to tenant URL, then base env', () => {
    delete process.env.ERP_URL_OVERRIDE;
    process.env.ERP_URL = 'http://u:p@prod:1/x';
    expect(resolveErpUrl('http://u:p@tenant:1/x')).toBe('http://u:p@tenant:1/x');
    expect(resolveErpUrl(undefined)).toBe('http://u:p@prod:1/x');
  });

  it('throws when no URL is configured', () => {
    delete process.env.ERP_URL_OVERRIDE;
    delete process.env.ERP_URL;
    expect(() => resolveErpUrl(undefined)).toThrow(/ERP_URL/);
  });
});
