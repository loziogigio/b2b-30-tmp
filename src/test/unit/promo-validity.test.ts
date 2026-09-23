import { describe, it, expect } from 'vitest';
import { isPromoOfferValid, romeCalendarDay } from '@/lib/cart/promo-validity';
import { productToErpPriceData } from '@utils/transform/inline-to-erp';
import type { PromoOffer } from '@utils/transform/erp-prices';

const offer = (over: Partial<PromoOffer> = {}): PromoOffer =>
  ({
    promo_code: 'P1',
    promo_row: 1,
    promo_title: '',
    promo_type: '',
    promo_qty_required: 1,
    promo_packaging_required: 0,
    promo_qty_per_packaging: 0,
    promo_min_pieces: 0,
    promo_min_value: 0,
    promo_net_price: 10,
    promo_ref_list_price: 0,
    promo_standard_price: 0,
    promo_start_date: '',
    promo_end_date: '',
    promo_extra_discounts: [],
    promo_gift_qty: 0,
    ...over,
  }) as PromoOffer;

// Rome midnight of 2026-09-02 and 2026-09-30 (CEST, UTC+2)
const window = {
  promo_start_at: '2026-09-01T22:00:00.000Z',
  promo_end_at: '2026-09-29T22:00:00.000Z',
};

describe('romeCalendarDay', () => {
  it('reads instants as Rome calendar days', () => {
    expect(romeCalendarDay('2026-09-29T22:00:00.000Z')).toBe('2026-09-30');
    expect(romeCalendarDay('2026-01-14T23:00:00.000Z')).toBe('2026-01-15');
  });
  it('passes plain calendar days through and rejects garbage', () => {
    expect(romeCalendarDay('2026-09-30')).toBe('2026-09-30');
    expect(romeCalendarDay('garbage')).toBe('');
  });
});

describe('isPromoOfferValid', () => {
  it('stays valid through its last Rome day and expires the next one', () => {
    expect(
      isPromoOfferValid(offer(window), new Date('2026-09-30T21:30:00Z')),
    ).toBe(true);
    expect(
      isPromoOfferValid(offer(window), new Date('2026-09-30T22:30:00Z')),
    ).toBe(false);
  });
  it('is not valid before its first day', () => {
    expect(
      isPromoOfferValid(offer(window), new Date('2026-09-01T12:00:00Z')),
    ).toBe(false);
  });
  it('falls back to the display dates when raw timestamps are absent', () => {
    const o = offer({
      promo_start_date: '2026-09-01',
      promo_end_date: '2026-09-30',
    });
    expect(isPromoOfferValid(o, new Date('2026-09-30T12:00:00Z'))).toBe(true);
    expect(isPromoOfferValid(o, new Date('2026-10-01T12:00:00Z'))).toBe(false);
  });
  it('treats an undated offer as valid and a disabled one as invalid', () => {
    expect(isPromoOfferValid(offer(), new Date())).toBe(true);
    expect(
      isPromoOfferValid(offer({ promo_is_active: false }), new Date()),
    ).toBe(false);
  });
});

describe('toErpPromoOffer carries the raw validity fields', () => {
  it('keeps the original timestamps and the active flag', () => {
    const pd = productToErpPriceData({
      id: 'E1',
      pricing: { status: 'priced', list: 10, vatRate: 22 },
      packagingOptions: [
        {
          code: 'CFZ',
          qty: 1,
          pricing: { list: 10 },
          promotions: [
            {
              promo_code: '025',
              promo_row: 3,
              promo_price: 8,
              start_date: window.promo_start_at,
              end_date: window.promo_end_at,
              is_active: true,
            },
          ],
        },
      ],
      packagingInfo: [],
    } as any);
    const [o] = pd!.all_promo_offers!;
    expect(o.promo_start_at).toBe(window.promo_start_at);
    expect(o.promo_end_at).toBe(window.promo_end_at);
    expect(o.promo_is_active).toBe(true);
    expect(o.promo_end_date).toBe('2026-09-29'); // display value unchanged
  });
});
