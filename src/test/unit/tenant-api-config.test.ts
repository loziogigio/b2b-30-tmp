import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Toggle single/multi tenant per test.
let mockSingleTenant = false;
vi.mock('@/lib/tenant/config', () => ({
  get isSingleTenant() {
    return mockSingleTenant;
  },
  get isMultiTenant() {
    return !mockSingleTenant;
  },
}));

const resolveTenant = vi.fn();
vi.mock('@/lib/tenant/service', () => ({
  resolveTenant: (...args: unknown[]) => resolveTenant(...args),
}));

import { resolveTenantApiConfig } from '@/lib/tenant/api-config';

const reqWithHost = (host: string) =>
  ({ headers: new Headers({ host }) }) as any;

beforeEach(() => {
  resolveTenant.mockReset();
  delete process.env.PIM_API_URL_OVERRIDE;
});
afterEach(() => {
  delete process.env.PIM_API_URL_OVERRIDE;
});

describe('resolveTenantApiConfig — common PIM URL resolution', () => {
  it('PIM_API_URL_OVERRIDE wins over the tenant pimApiUrl (local dev)', async () => {
    mockSingleTenant = false;
    process.env.PIM_API_URL_OVERRIDE = 'http://localhost:3001';
    resolveTenant.mockResolvedValue({
      id: 'baseprotection-com',
      api: { pimApiUrl: 'http://vinc-cs:3000', apiKeyId: 'k', apiSecret: 's' },
    });

    const cfg = await resolveTenantApiConfig(reqWithHost('base.example.com'));
    expect(cfg.pimApiUrl).toBe('http://localhost:3001');
    expect(cfg.tenantId).toBe('baseprotection-com');
  });

  it('falls back to the tenant pimApiUrl when no override is set', async () => {
    mockSingleTenant = false;
    resolveTenant.mockResolvedValue({
      id: 'baseprotection-com',
      api: { pimApiUrl: 'http://vinc-cs:3000', apiKeyId: 'k', apiSecret: 's' },
    });

    const cfg = await resolveTenantApiConfig(reqWithHost('base.example.com'));
    expect(cfg.pimApiUrl).toBe('http://vinc-cs:3000');
    expect(cfg.tenantId).toBe('baseprotection-com');
  });

  it('honours the override in single-tenant mode too', async () => {
    mockSingleTenant = true;
    process.env.PIM_API_URL_OVERRIDE = 'http://localhost:3001';

    const cfg = await resolveTenantApiConfig(reqWithHost('localhost'));
    expect(cfg.pimApiUrl).toBe('http://localhost:3001');
    expect(resolveTenant).not.toHaveBeenCalled();
  });
});
