import { describe, it, expect } from 'vitest';
import {
  mapErpSettingsRecord,
  DEFAULT_ERP_SETTINGS,
} from '@/lib/erp/data-model-config';

describe('mapErpSettingsRecord', () => {
  it('maps a stored data object to typed MyMbErpSettings', () => {
    const settings = mapErpSettingsRecord({
      packaging_options_id: '3,1,2',
      is_managed_substitutes: true,
      is_managed_supplier_order: false,
      cases: [
        { case: 0, label: 'OK', add_to_cart: true },
        { case: 4, label: 'NO', add_to_cart: false },
      ],
      update_promo_seconds: 100,
      update_available_again_seconds: 200,
    });
    expect(settings.packagingOptionsId).toEqual([3, 1, 2]);
    expect(settings.isManagedSubstitutes).toBe(true);
    expect(settings.isManagedSupplierOrder).toBe(false);
    expect(settings.cases['0']).toEqual({ label: 'OK', addToCart: true });
    expect(settings.cases['4']).toEqual({ label: 'NO', addToCart: false });
    expect(settings.updatePromoSeconds).toBe(100);
    expect(settings.updateAvailableAgainSeconds).toBe(200);
  });

  it('falls back to defaults for missing/blank fields', () => {
    const settings = mapErpSettingsRecord({});
    expect(settings.packagingOptionsId).toEqual([]);
    expect(settings.updatePromoSeconds).toBe(
      DEFAULT_ERP_SETTINGS.updatePromoSeconds,
    );
    expect(settings.cases).toEqual({});
  });

  it('maps erp_channel to erpChannel, trimmed', () => {
    expect(mapErpSettingsRecord({ erp_channel: ' B2B ' }).erpChannel).toBe(
      'B2B',
    );
  });

  it('leaves erpChannel undefined when erp_channel is absent or blank', () => {
    // Undefined is what keeps the `canale` key out of the ERP request body, so
    // tenants that never set the field keep the promos they get today.
    expect(mapErpSettingsRecord({}).erpChannel).toBeUndefined();
    expect(
      mapErpSettingsRecord({ erp_channel: '' }).erpChannel,
    ).toBeUndefined();
    expect(
      mapErpSettingsRecord({ erp_channel: '  ' }).erpChannel,
    ).toBeUndefined();
    expect(DEFAULT_ERP_SETTINGS.erpChannel).toBeUndefined();
  });

  it('ignores empty segments when parsing packaging_options_id', () => {
    expect(
      mapErpSettingsRecord({ packaging_options_id: '3, ,1,' })
        .packagingOptionsId,
    ).toEqual([3, 1]);
  });
});
