import { describe, it, expect } from 'vitest';
import {
  selectBestPrice,
  cleanTitle,
  promoLabel,
} from '@framework/pricing/best-price';
import type { ErpPriceData, PromoOffer } from '@utils/transform/erp-prices';

const offer = (over: Partial<PromoOffer>): PromoOffer =>
  ({
    promo_code: 'P1',
    promo_row: 1,
    promo_title: 'Promo Uno',
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

/** net_price is the listino; default packaging step (MV) gates promo eligibility. */
const priceData = (
  netPrice: number,
  offers: PromoOffer[],
  mv = 12,
): ErpPriceData =>
  ({
    entity_code: 'SKU1',
    net_price: netPrice,
    gross_price: 0,
    price: 0,
    price_discount: 0,
    vat_percent: 22,
    availability: 5,
    discount: [],
    discount_description: '',
    packaging_option_default: { qty_x_packaging: mv } as any,
    all_promo_offers: offers,
  }) as ErpPriceData;

describe('selectBestPrice', () => {
  it('falls back to the listino when there are no promos', () => {
    const r = selectBestPrice(priceData(7.18, []));
    expect(r).toMatchObject({
      effectivePrice: 7.18,
      source: 'listino',
      hasPromos: false,
    });
    expect(r.offer).toBeNull();
  });

  it('picks a qualifying promo that beats the listino', () => {
    const r = selectBestPrice(
      priceData(7.18, [offer({ promo_net_price: 3.95 })]),
    );
    expect(r).toMatchObject({ effectivePrice: 3.95, source: 'promo' });
    expect(r.offer?.promo_code).toBe('P1');
  });

  it('keeps the listino when it undercuts every promo, but still flags promos', () => {
    // The "paradossalmente" case: the list price is cheaper than the promo.
    const r = selectBestPrice(
      priceData(3.5, [offer({ promo_net_price: 3.95 })]),
    );
    expect(r).toMatchObject({
      effectivePrice: 3.5,
      source: 'listino',
      hasPromos: true,
    });
  });

  it('picks the cheapest of several qualifying promos', () => {
    const r = selectBestPrice(
      priceData(7.18, [
        offer({ promo_code: 'A', promo_net_price: 5.0 }),
        offer({ promo_code: 'B', promo_net_price: 3.95 }),
        offer({ promo_code: 'C', promo_net_price: 6.2 }),
      ]),
    );
    expect(r.effectivePrice).toBe(3.95);
    expect(r.offer?.promo_code).toBe('B');
  });

  it('ignores promos whose required qty exceeds the default packaging step', () => {
    const r = selectBestPrice(
      priceData(
        7.18,
        [offer({ promo_net_price: 1.0, promo_qty_required: 100 })],
        12,
      ),
    );
    expect(r).toMatchObject({
      effectivePrice: 7.18,
      source: 'listino',
      hasPromos: true,
    });
  });

  it('prefers the promo on an exact tie with the listino', () => {
    const r = selectBestPrice(
      priceData(3.95, [offer({ promo_net_price: 3.95 })]),
    );
    expect(r.source).toBe('promo');
  });

  it('returns every promo title, winner first', () => {
    const r = selectBestPrice(
      priceData(7.18, [
        offer({
          promo_code: 'A',
          promo_net_price: 5.0,
          promo_title: 'Sconto A',
        }),
        offer({
          promo_code: 'B',
          promo_net_price: 3.95,
          promo_title: 'Sconto B',
        }),
      ]),
    );
    expect(r.promoTitles).toEqual(['Sconto B', 'Sconto A']);
  });

  it('survives absent price data and absent offer list', () => {
    expect(selectBestPrice(null)).toMatchObject({
      effectivePrice: 0,
      source: 'listino',
      hasPromos: false,
    });
    const bare = { entity_code: 'X', net_price: 2 } as ErpPriceData;
    expect(selectBestPrice(bare).effectivePrice).toBe(2);
  });

  it('a missing listino (net_price: 0) must not beat a qualifying promo', () => {
    // Regression: transformErpPricesResponse maps a missing ERP net_price to
    // 0. A 0 listino must never "win" over a real promo price.
    const r = selectBestPrice(priceData(0, [offer({ promo_net_price: 3.95 })]));
    expect(r).toMatchObject({ effectivePrice: 3.95, source: 'promo' });
    expect(r.offer?.promo_code).toBe('P1');
  });

  it('an absent net_price must not beat a qualifying promo', () => {
    const bare = {
      entity_code: 'X',
      packaging_option_default: { qty_x_packaging: 12 } as any,
      all_promo_offers: [offer({ promo_net_price: 3.95 })],
    } as ErpPriceData;
    const r = selectBestPrice(bare);
    expect(r).toMatchObject({ effectivePrice: 3.95, source: 'promo' });
  });

  it('a missing listino (net_price: 0) with no promos yields 0, not a crash', () => {
    const r = selectBestPrice(priceData(0, []));
    expect(r).toMatchObject({
      effectivePrice: 0,
      source: 'listino',
      hasPromos: false,
    });
    expect(r.offer).toBeNull();
  });

  it('a valid positive listino keeps winning ties and undercutting promos unchanged', () => {
    // Same as the "paradossalmente" case above, re-asserted alongside the
    // net_price:0 regression tests to pin down that the fix doesn't touch
    // the positive-listino path.
    const undercut = selectBestPrice(
      priceData(3.5, [offer({ promo_net_price: 3.95 })]),
    );
    expect(undercut).toMatchObject({ effectivePrice: 3.5, source: 'listino' });

    const tie = selectBestPrice(
      priceData(3.95, [offer({ promo_net_price: 3.95 })]),
    );
    expect(tie.source).toBe('promo');
  });
});

describe('promoLabel', () => {
  it('uses the ERP title when there is one', () => {
    expect(promoLabel({ promo_title: 'Sconto Estate', promo_code: 'P1' })).toBe(
      'Sconto Estate',
    );
  });

  /**
   * MyMB frequently ships a promo with a code but a BLANK TitoloPromozione,
   * which is why promos rendered nameless. The code is always present and is
   * what the buyer and the back office refer to, so it is the fallback.
   */
  it('falls back to the promo CODE when the ERP sent no title', () => {
    expect(promoLabel({ promo_title: '', promo_code: 'IMPMIN' })).toBe(
      'IMPMIN',
    );
    expect(promoLabel({ promo_code: 'P42' })).toBe('P42');
  });

  it('falls back to the code when the title is an ERP placeholder', () => {
    expect(promoLabel({ promo_title: '---', promo_code: 'P7' })).toBe('P7');
  });

  it('returns empty when there is neither a title nor a code', () => {
    expect(promoLabel({ promo_title: '  ', promo_code: '' })).toBe('');
    expect(promoLabel(undefined)).toBe('');
  });
});

describe('cleanTitle', () => {
  it('drops ERP placeholder titles', () => {
    expect(cleanTitle('---')).toBe('');
    expect(cleanTitle('  __ ')).toBe('');
    expect(cleanTitle(undefined)).toBe('');
  });

  it('keeps real titles, trimmed', () => {
    expect(cleanTitle('  Sconto Estate  ')).toBe('Sconto Estate');
  });
});
