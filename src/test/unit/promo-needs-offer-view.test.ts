import { describe, expect, it } from 'vitest';
import { promoNeedsOfferView } from '@components/themes/time/product/time-promo-gated-cta';

/**
 * One predicate decides, on every time listing surface (grid card, search row,
 * catalog list row), whether an article's promos still need picking — and so
 * whether the CTA reads "VEDI OFFERTE" or the generic "Visualizza".
 */
const offer = (over: Record<string, unknown> = {}) => ({
  promo_code: 'P1',
  promo_row: 1,
  promo_net_price: 1.2,
  promo_qty_required: 12,
  ...over,
});

describe('promoNeedsOfferView', () => {
  it('is false without any promo', () => {
    expect(promoNeedsOfferView(undefined)).toBe(false);
    expect(promoNeedsOfferView({ net_price: 10 } as any)).toBe(false);
  });

  it('is true for several offers even when the ERP leaves count_promo at 0', () => {
    // BF00811's real shape: count_promo 0, two entries in all_promo.
    expect(
      promoNeedsOfferView({
        is_promo: true,
        promo: true,
        is_improving_promo: true,
        count_promo: 0,
        all_promo_offers: [offer(), offer({ promo_code: 'P2' })],
      } as any),
    ).toBe(true);
  });

  it('is false for a single offer the default packaging already triggers', () => {
    expect(
      promoNeedsOfferView({
        is_promo: true,
        is_improving_promo: true,
        all_promo_offers: [offer()],
      } as any),
    ).toBe(false);
  });

  it('is true for a single non-improving offer (threshold promo)', () => {
    expect(
      promoNeedsOfferView({
        is_promo: true,
        is_improving_promo: false,
        all_promo_offers: [offer({ promo_min_value: 500 })],
      } as any),
    ).toBe(true);
  });
});

describe('promo gating no longer depends on count_promo', () => {
  it('treats two real offers as multiple even though count_promo is 0', () => {
    // RighePromo is an OBJECT, so `Array.isArray` in the transform is always
    // false and count_promo is 0 for every article, always. Verified live
    // 2026-09-08: count_promo 0 alongside num_promo 2.
    const pd = {
      is_promo: true,
      promo: true,
      count_promo: 0,
      is_improving_promo: true,
      all_promo_offers: [{ promo_code: 'A' }, { promo_code: 'B' }],
    } as any;
    expect(promoNeedsOfferView(pd)).toBe(true);
  });
});
