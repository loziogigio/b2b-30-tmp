import { describe, it, expect } from 'vitest';
import vectors from '../fixtures/listino-unit-price-vectors.json';
import { diffCartPrices } from '@/lib/cart/price-check';
import { mapCSLineItemToItem } from '@utils/adapter/cart-adapter';
import { transformPimProduct } from '@framework/product/get-pim-product';
import { productToErpPriceData } from '@utils/transform/inline-to-erp';
import type { ErpPriceData, PromoOffer } from '@utils/transform/erp-prices';

const NOW = new Date('2026-09-23T10:00:00Z');

const offer = (over: Partial<PromoOffer> = {}): PromoOffer =>
  ({
    promo_code: 'A',
    promo_row: 1,
    promo_title: '',
    promo_type: '',
    promo_qty_required: 1,
    promo_packaging_required: 0,
    promo_qty_per_packaging: 0,
    promo_min_pieces: 0,
    promo_min_value: 0,
    promo_net_price: 3.95,
    promo_ref_list_price: 0,
    promo_standard_price: 0,
    promo_start_date: '2026-09-02',
    promo_end_date: '2026-09-30',
    promo_start_at: '2026-09-01T22:00:00.000Z',
    promo_end_at: '2026-09-29T22:00:00.000Z',
    promo_extra_discounts: [],
    promo_gift_qty: 0,
    ...over,
  }) as PromoOffer;

const priceData = (
  net: number,
  offers: PromoOffer[] = [],
  over: Partial<ErpPriceData> = {},
): ErpPriceData =>
  ({
    entity_code: 'E1',
    net_price: net,
    gross_price: 20,
    price: 20,
    price_discount: net,
    vat_percent: 22,
    availability: 5,
    discount: [],
    discount_description: '',
    packaging_option_default: { qty_x_packaging: 1 } as any,
    packaging_option_smallest: { qty_x_packaging: 1 } as any,
    all_promo_offers: offers,
    ...over,
  }) as ErpPriceData;

/** A cart line exactly as the cart adapter builds it from a CS line. */
const line = (o: Record<string, any> = {}) =>
  mapCSLineItemToItem({
    line_number: 10,
    entity_code: 'E1',
    sku: 'S-1',
    name: 'Articolo',
    quantity: 12,
    unit_price: 7.18,
    list_price: 20,
    vat_rate: 22,
    product_source: 'pim',
    discounts: [],
    ...o,
  });

const check = (items: any[], map: Record<string, ErpPriceData>) =>
  diffCartPrices(items, map, { now: NOW, decimals: 2 });

describe('diffCartPrices', () => {
  it('accepts a listino line at today’s price', () => {
    expect(check([line()], { E1: priceData(7.18) }).anomalies).toEqual([]);
  });

  it('flags a listino line whose price moved, with old and new price', () => {
    const { anomalies, erpItems } = check([line()], { E1: priceData(7.5) });
    expect(anomalies).toEqual([
      expect.objectContaining({
        IdRiga: 10,
        entity_code: 'E1',
        unit_price: 7.18,
        expected_unit_price: 7.5,
        IsPrezzoVariato: true,
      }),
    ]);
    expect(erpItems).toEqual([
      { erp_line_number: 10, erp_data: { oarti: 'S-1' } },
    ]);
  });

  it('ignores sub-cent noise at the cart precision', () => {
    expect(
      check([line({ unit_price: 5.33 })], { E1: priceData(5.3325) }).anomalies,
    ).toEqual([]);
  });

  it('accepts a promo line while its promo is offered at the same price', () => {
    const promo = line({ unit_price: 3.95, promo_code: 'A', promo_row: 1 });
    expect(
      check([promo], { E1: priceData(7.18, [offer()]) }).anomalies,
    ).toEqual([]);
  });

  it('flags a promo line whose promo is gone or out of its dates', () => {
    const promo = line({ unit_price: 3.95, promo_code: 'A', promo_row: 1 });
    expect(check([promo], { E1: priceData(7.18) }).anomalies[0]).toMatchObject({
      IsPromozioneScaduta: true,
      expected_unit_price: null,
      promo_code: 'A',
    });
    const ended = offer({ promo_end_at: '2026-09-20T22:00:00.000Z' });
    expect(
      check([promo], { E1: priceData(7.18, [ended]) }).anomalies[0]
        .IsPromozioneScaduta,
    ).toBe(true);
  });

  it('flags a promo line whose promo price moved', () => {
    const promo = line({ unit_price: 3.95, promo_code: 'A', promo_row: 1 });
    const [a] = check([promo], {
      E1: priceData(7.18, [offer({ promo_net_price: 4.2 })]),
    }).anomalies;
    expect(a).toMatchObject({
      IsPrezzoVariato: true,
      expected_unit_price: 4.2,
    });
  });

  it('flags a product the catalog no longer returns or no longer prices', () => {
    expect(check([line()], {}).anomalies[0].IsArticoloNonVendibile).toBe(true);
    expect(
      check([line()], { E1: priceData(0) }).anomalies[0].IsArticoloNonVendibile,
    ).toBe(true);
  });

  it('flags a changed discount chain on its own', () => {
    const [a] = check([line()], {
      E1: priceData(7.18, [], { discount: [10] }),
    }).anomalies;
    expect(a.IsScontiVariati).toBe(true);
    expect(a.IsPrezzoVariato).toBeUndefined();
  });

  it('skips gift lines, non-catalog lines and optimistic lines without a row id', () => {
    const optimistic = { ...line(), rowId: undefined };
    const items = [
      line({ is_gift_line: true, unit_price: 0 }),
      line({ line_number: 20, product_source: 'manual', unit_price: 1 }),
      optimistic,
    ];
    expect(check(items, { E1: priceData(7.18) }).anomalies).toEqual([]);
  });

  describe('shared listino vectors (same file as the CS gate)', () => {
    for (const v of vectors as Array<{
      name: string;
      product: any;
      expected_unit_price: number;
    }>) {
      it(v.name, () => {
        const pd = productToErpPriceData(transformPimProduct(v.product));
        const booked = line({
          entity_code: v.product.entity_code,
          unit_price: v.expected_unit_price,
        });
        const map = { [v.product.entity_code]: pd! };
        expect(check([booked], map).anomalies).toEqual([]);
        expect(Number(pd!.net_price)).toBeCloseTo(v.expected_unit_price, 6);
      });
    }
  });
});
