import { describe, it, expect } from 'vitest';
import { toPublicInfo } from '@/lib/tenant/types';
import type { TenantConfig } from '@/lib/tenant/types';

function baseTenant(overrides: Partial<TenantConfig> = {}): TenantConfig {
  return {
    id: 'demo-it',
    name: 'Velia Ferramenta',
    projectCode: 'vinc-demo-it',
    domains: [],
    api: {
      pimApiUrl: 'http://cs',
      b2bApiUrl: 'http://cs',
      apiKeyId: 'k',
      apiSecret: 's',
    },
    database: { mongoUrl: 'mongodb://x', mongoDb: 'vinc-demo-it' },
    isActive: true,
    ...overrides,
  };
}

describe('TenantFeatures.isDemo → toPublicInfo passthrough', () => {
  it('exposes isDemo to the public info when set', () => {
    const tenant = baseTenant({
      features: { pricingSource: 'inline', isDemo: true },
    });
    const pub = toPublicInfo(tenant);
    expect(pub.features?.isDemo).toBe(true);
    expect(pub.features?.pricingSource).toBe('inline');
  });

  it('leaves isDemo undefined when features is undefined', () => {
    const pub = toPublicInfo(baseTenant({ features: undefined }));
    expect(pub.features?.isDemo).toBeUndefined();
  });
});
