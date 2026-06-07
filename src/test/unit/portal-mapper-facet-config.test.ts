import { describe, it, expect } from 'vitest';
import { mapPortalToHomeSettings } from '@/lib/home-settings/portal-mapper';

describe('mapPortalToHomeSettings facetConfig', () => {
  it('maps facet_config → facetConfig', () => {
    const portal: any = {
      branding: {},
      facet_config: { entries: [{ field: 'brand_id', visible: true }] },
    };
    const hs = mapPortalToHomeSettings(portal);
    expect(hs.facetConfig?.entries[0].field).toBe('brand_id');
  });

  it('leaves facetConfig undefined when portal has none', () => {
    const hs = mapPortalToHomeSettings({ branding: {} } as any);
    expect(hs.facetConfig).toBeUndefined();
  });
});
