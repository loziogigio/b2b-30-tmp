import { describe, it, expect } from 'vitest';
import { hasActivePromo } from '@/components/themes/time/product/time-promo-gated-cta';

describe('hasActivePromo — who decides a product is on promo', () => {
  it('guest (no ERP authority): the PIM flag still badges', () => {
    expect(hasActivePromo({ has_active_promo: true }, undefined, false)).toBe(
      true,
    );
  });

  it('ERP authoritative and its row says no promo: PIM cannot override', () => {
    // The bug: catalog-wide PIM data badged a product the ERP prices at listino.
    expect(
      hasActivePromo(
        { has_active_promo: true },
        { is_promo: false } as any,
        true,
      ),
    ).toBe(false);
  });

  it('ERP authoritative and its row says promo: badge', () => {
    expect(
      hasActivePromo(
        { has_active_promo: false },
        { is_promo: true } as any,
        true,
      ),
    ).toBe(true);
  });

  it('ERP authoritative but the row has not arrived: no badge yet', () => {
    // undefined means "still loading" here; showing a badge now would make it
    // flash off when the real row lands.
    expect(hasActivePromo({ has_active_promo: true }, undefined, true)).toBe(
      false,
    );
  });

  it('defaults to the legacy behaviour when authority is not stated', () => {
    expect(hasActivePromo({ has_active_promo: true }, undefined)).toBe(true);
  });

  it('a multi-variant parent still reflects its variations', () => {
    const parent = {
      has_active_promo: false,
      variations: [{ has_active_promo: false }, { is_promo: true }],
    };
    expect(hasActivePromo(parent, undefined, true)).toBe(true);
  });
});
