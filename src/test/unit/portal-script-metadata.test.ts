import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resolveTenant: vi.fn() }));
vi.mock('@/lib/tenant', () => ({
  isSingleTenant: false,
  resolveTenant: mocks.resolveTenant,
}));

import { mapPortalToHomeSettings } from '@/lib/home-settings/portal-mapper';
import { resolveCsCredsForHost } from '@/lib/profile/cs-creds';
import { STOREFRONT_CHANNEL } from '@/lib/security/storefront-channel';
import { ERP_STATIC_STORAGE_KEY } from '@/framework/basic-rest/utils/static';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('custom script metadata', () => {
  it('maps script_id and flags scripts that have data access', () => {
    const hs = mapPortalToHomeSettings({
      branding: {},
      custom_scripts: [
        {
          label: 'Preventivatore',
          inline_code: 'run()',
          placement: 'head',
          loading_strategy: 'async',
          enabled: true,
          script_id: 'scr_aaaaaaaaaaaa',
          data_access: [{ model: 'preventivi', access: 'read_write' }],
        },
        {
          label: 'Analytics',
          src: 'https://x.test/a.js',
          placement: 'head',
          loading_strategy: 'async',
          enabled: true,
          script_id: 'scr_bbbbbbbbbbbb',
        },
      ],
    } as any);
    expect(hs.customScripts?.[0]).toMatchObject({
      scriptId: 'scr_aaaaaaaaaaaa',
      hasDataAccess: true,
    });
    expect(hs.customScripts?.[1]).toMatchObject({
      scriptId: 'scr_bbbbbbbbbbbb',
    });
    expect(hs.customScripts?.[1]).not.toHaveProperty('hasDataAccess');
    expect(JSON.stringify(hs.customScripts)).not.toContain('preventivi');
  });
});

describe('shared constants', () => {
  it('exposes the storefront channel and the ERP selection storage key', () => {
    expect(STOREFRONT_CHANNEL).toBe('b2b');
    expect(ERP_STATIC_STORAGE_KEY).toBe('erp-static');
  });
});

describe('resolveCsCredsForHost', () => {
  it('resolves tenant credentials by hostname in multi-tenant mode', async () => {
    mocks.resolveTenant.mockResolvedValue({
      api: { pimApiUrl: 'https://cs.test', apiKeyId: 'k', apiSecret: 's' },
    });
    expect(await resolveCsCredsForHost('b2b.hidros.test')).toEqual({
      csBaseUrl: 'https://cs.test',
      apiKeyId: 'k',
      apiSecret: 's',
    });
    expect(mocks.resolveTenant).toHaveBeenCalledWith('b2b.hidros.test');
  });
  it('prefers PIM_API_URL_OVERRIDE for local development', async () => {
    vi.stubEnv('PIM_API_URL_OVERRIDE', 'http://localhost:3001');
    mocks.resolveTenant.mockResolvedValue({
      api: { pimApiUrl: 'https://cs.test', apiKeyId: 'k', apiSecret: 's' },
    });
    expect((await resolveCsCredsForHost('x')).csBaseUrl).toBe(
      'http://localhost:3001',
    );
  });
});
