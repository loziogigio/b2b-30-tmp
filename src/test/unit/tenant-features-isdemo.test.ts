import { describe, it, expect } from 'vitest';
import { toPublicInfo } from '@/lib/tenant/types';
import type { TenantConfig } from '@/lib/tenant/types';
import { fromDocument } from '@/lib/tenant/service';

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

describe('fromDocument maps snake_case features.is_demo → isDemo', () => {
  const baseDoc = {
    tenant_id: 'demo-it',
    project_code: 'vinc-demo-it',
    domains: [{ hostname: 'demo-b2b.vendereincloud.it' }],
    status: 'active',
  } as any;

  it('maps is_demo:true through to features.isDemo:true', () => {
    const cfg = fromDocument({
      ...baseDoc,
      features: { pricing_source: 'inline', is_demo: true },
    });
    expect(cfg.features?.isDemo).toBe(true);
    expect(cfg.features?.pricingSource).toBe('inline');
  });

  it('leaves isDemo undefined when the doc omits is_demo', () => {
    const cfg = fromDocument({
      ...baseDoc,
      features: { pricing_source: 'erp' },
    });
    expect(cfg.features?.pricingSource).toBe('erp');
    expect(cfg.features?.isDemo).toBeUndefined();
  });

  it('leaves features undefined when the doc has no features', () => {
    const cfg = fromDocument({ ...baseDoc });
    expect(cfg.features).toBeUndefined();
  });
});
