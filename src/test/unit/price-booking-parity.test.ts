import { describe, it, expect } from 'vitest';
import { selectBestPrice } from '@framework/pricing/best-price';
import {
  buildCartPriceData,
  buildPromoPriceData,
} from '@components/product/b2b-offer-rows';
import { buildAddPayload } from '@components/product/add-to-cart';
import { netOf } from '@components/themes/time/product/time-row-helpers';
import type { ErpPriceData, PromoOffer } from '@utils/transform/erp-prices';

/**
 * THE INVARIANT: the price the card DISPLAYS must be the price the cart line
 * BOOKS. Display reads `selectBestPrice(pd).effectivePrice`; the booking layer
 * reads `net_price` off whatever ErpPriceData is handed to <AddToCart>
 * (see `buildAddPayload` in add-to-cart.tsx: `price_discount: net_price`).
 *
 * These tests pin the pure seam between the two.
 */

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

/** `net_price` is the listino; the default packaging step (MV) gates promos. */
const priceData = (
  netPrice: number,
  offers: PromoOffer[],
  mv = 12,
  over: Partial<ErpPriceData> = {},
): ErpPriceData =>
  ({
    entity_code: 'SKU1',
    net_price: netPrice,
    gross_price: 20,
    price: 20,
    price_discount: netPrice,
    vat_percent: 22,
    availability: 5,
    discount: [],
    discount_description: '',
    packaging_option_default: { qty_x_packaging: mv } as any,
    packaging_option_smallest: { qty_x_packaging: 1 } as any,
    all_promo_offers: offers,
    ...over,
  }) as ErpPriceData;

/** The REAL cart payload add-to-cart.tsx sends for a given ErpPriceData. */
const payloadOf = (pd: ErpPriceData) =>
  buildAddPayload({ itemId: 'SKU1', qty: 1, priceData: pd });

/** What add-to-cart.tsx books as the unit price for a given ErpPriceData. */
const bookedPrice = (pd: ErpPriceData) => payloadOf(pd).price_discount;
/** What add-to-cart.tsx sends as the promo identity for a given ErpPriceData. */
const bookedPromo = (pd: ErpPriceData) => ({
  promo_code: payloadOf(pd).promo_code,
  promo_row: payloadOf(pd).promo_row,
});

describe('display/booking parity', () => {
  it('books the promo price when a qualifying promo undercuts the listino', () => {
    const pd = priceData(7.18, [
      offer({ promo_code: 'A', promo_net_price: 3.95, promo_qty_required: 1 }),
    ]);
    const best = selectBestPrice(pd);

    expect(best.source).toBe('promo');
    expect(best.effectivePrice).toBe(3.95);

    // The booking layer substitutes the winning offer.
    const cartPd = buildPromoPriceData(pd, best.offer!);
    expect(cartPd.net_price).toBe(best.effectivePrice);
    expect(buildCartPriceData(pd).net_price).toBe(best.effectivePrice);
    expect(bookedPrice(buildCartPriceData(pd))).toBe(3.95);
    expect(bookedPromo(buildCartPriceData(pd))).toEqual({
      promo_code: 'A',
      promo_row: 1,
    });
  });

  it('books the LISTINO — not the promo — when the listino undercuts every promo (paradox case)', () => {
    // Listino 3.50 beats the only qualifying promo at 3.95.
    const pd = priceData(3.5, [
      offer({ promo_code: 'A', promo_net_price: 3.95, promo_qty_required: 1 }),
    ]);
    const best = selectBestPrice(pd);

    expect(best.source).toBe('listino');
    expect(best.offer).toBeNull();
    expect(best.effectivePrice).toBe(3.5);

    // No offer -> booking falls through to the base pd, whose net_price IS
    // the listino, which is exactly what the card displays.
    const cartPd = buildCartPriceData(pd);
    expect(bookedPrice(cartPd)).toBe(3.5);
    expect(bookedPrice(cartPd)).toBe(best.effectivePrice);
    expect(bookedPrice(cartPd)).not.toBe(3.95);
  });

  it('never books a LISTINO price under a promo code (flattened improving_promo)', () => {
    // The ERP flattens its pre-selected `improving_promo` onto the base row,
    // so the base pd carries promo_code/promo_row/is_promo even when the
    // listino wins. Booking the listino under that promo code would be wrong.
    const pd = priceData(
      3.5,
      [
        offer({
          promo_code: 'A',
          promo_net_price: 3.95,
          promo_qty_required: 1,
        }),
      ],
      12,
      {
        is_promo: true,
        promo: true,
        promo_code: 'A',
        promo_row: 1,
        discount_extra: [5, 2],
      } as Partial<ErpPriceData>,
    );

    expect(selectBestPrice(pd).source).toBe('listino');

    const cartPd = buildCartPriceData(pd);
    expect(bookedPrice(cartPd)).toBe(3.5);
    expect(bookedPromo(cartPd)).toEqual({ promo_code: 0, promo_row: 0 });
    expect(cartPd.is_promo).toBe(false);
    // The flattened promo's extra-discount ladder must not ride along on a
    // listino line — add-to-cart merges `discount_extra` into discount1..6.
    expect(cartPd.discount_extra).toEqual([]);
  });

  it('leaves a plain non-promo listino untouched', () => {
    const pd = priceData(3.5, [], 12, {
      discount: [10],
      discount_extra: [5],
    } as Partial<ErpPriceData>);
    const cartPd = buildCartPriceData(pd);

    expect(bookedPrice(cartPd)).toBe(selectBestPrice(pd).effectivePrice);
    expect(cartPd.discount_extra).toEqual([5]);
    expect(cartPd.discount).toEqual([10]);
  });

  it('books the CHEAPEST qualifying promo when several qualify', () => {
    const pd = priceData(7.18, [
      offer({ promo_code: 'A', promo_net_price: 5.5, promo_qty_required: 1 }),
      offer({
        promo_code: 'B',
        promo_row: 2,
        promo_net_price: 3.95,
        promo_qty_required: 2,
      }),
      offer({
        promo_code: 'C',
        promo_row: 3,
        promo_net_price: 6.0,
        promo_qty_required: 4,
      }),
    ]);
    const best = selectBestPrice(pd);

    expect(best.effectivePrice).toBe(3.95);
    expect(best.offer?.promo_code).toBe('B');

    const cartPd = buildCartPriceData(pd);
    expect(bookedPrice(cartPd)).toBe(3.95);
    expect(bookedPrice(cartPd)).toBe(best.effectivePrice);
    expect(bookedPromo(cartPd)).toEqual({ promo_code: 'B', promo_row: 2 });
  });

  it('neither displays nor books a cheaper promo the default packaging cannot trigger', () => {
    // MV = 2, but the 1.99 promo needs 10 pieces -> it does not qualify.
    const pd = priceData(
      7.18,
      [
        offer({ promo_code: 'A', promo_net_price: 5.5, promo_qty_required: 2 }),
        offer({
          promo_code: 'BIG',
          promo_row: 9,
          promo_net_price: 1.99,
          promo_qty_required: 10,
        }),
      ],
      2,
    );
    const best = selectBestPrice(pd);

    expect(best.effectivePrice).toBe(5.5);
    expect(best.offer?.promo_code).toBe('A');

    const cartPd = buildCartPriceData(pd);
    expect(bookedPrice(cartPd)).toBe(5.5);
    expect(bookedPrice(cartPd)).not.toBe(1.99);
    expect(bookedPromo(cartPd).promo_code).not.toBe('BIG');
  });

  it('books the listino when no promo qualifies at all', () => {
    const pd = priceData(
      7.18,
      [
        offer({
          promo_code: 'BIG',
          promo_net_price: 1.99,
          promo_qty_required: 10,
        }),
      ],
      2,
    );
    const best = selectBestPrice(pd);

    expect(best.source).toBe('listino');
    expect(bookedPrice(buildCartPriceData(pd))).toBe(best.effectivePrice);
    expect(bookedPrice(buildCartPriceData(pd))).toBe(7.18);
  });
});

/**
 * The ERP flattens its pre-selected `improving_promo` onto `price_discount`,
 * so a real listino-wins row arrives with `price_discount !== net_price`.
 * The DISPLAY layer (`netOf`, the detail headline) reads `price_discount`;
 * the BOOKING layer reads `net_price`. If `buildCartPriceData` leaves the
 * stale promo on `price_discount`, the row SHOWS 3.95 and CHARGES 3.50.
 */
describe('display/booking parity when the ERP flattened a promo onto price_discount', () => {
  /** Listino 3.50 wins; the ERP still flattened its 3.95 promo onto the row. */
  const divergent = () =>
    priceData(
      3.5,
      [
        offer({
          promo_code: 'A',
          promo_net_price: 3.95,
          promo_qty_required: 1,
        }),
      ],
      12,
      {
        price_discount: 3.95,
        is_promo: true,
        promo: true,
        promo_code: 'A',
        promo_row: 1,
      } as Partial<ErpPriceData>,
    );

  it('the fixture really does diverge (guards the old blind spot)', () => {
    const pd = divergent();
    expect(pd.price_discount).not.toBe(pd.net_price);
    expect(selectBestPrice(pd).source).toBe('listino');
    expect(selectBestPrice(pd).effectivePrice).toBe(3.5);
  });

  it('returns an internally consistent row: net_price === price_discount === effectivePrice', () => {
    const pd = divergent();
    const cartPd = buildCartPriceData(pd);
    const effective = selectBestPrice(pd).effectivePrice;

    expect(cartPd.net_price).toBe(effective);
    expect(cartPd.price_discount).toBe(effective);
    expect(cartPd.net_price).toBe(cartPd.price_discount);
    expect(cartPd.promo_price).toBeUndefined();
  });

  it('DISPLAYS the price it BOOKS (no 3.95 shown on a line charged 3.50)', () => {
    const pd = divergent();
    const cartPd = buildCartPriceData(pd);

    // What the variants table renders for this row...
    expect(netOf(cartPd)).toBe(3.5);
    // ...is exactly what the cart line charges.
    expect(bookedPrice(cartPd)).toBe(3.5);
    expect(netOf(cartPd)).toBe(bookedPrice(cartPd));
    expect(netOf(cartPd)).not.toBe(3.95);
  });

  it('netOf() agrees with the booked price straight off the RAW erp row', () => {
    // The detail headline and the search rows call netOf on the un-adapted pd.
    const pd = divergent();
    expect(netOf(pd)).toBe(selectBestPrice(pd).effectivePrice);
    expect(netOf(pd)).toBe(bookedPrice(buildCartPriceData(pd)));
  });

  it('netOf() keeps returning null when there is no price at all', () => {
    expect(netOf(undefined)).toBeNull();
    expect(
      netOf(
        priceData(0, [], 1, {
          price_discount: 0,
          gross_price: 0,
          price_gross: 0,
        } as any),
      ),
    ).toBeNull();
  });

  it('the optimistic local cart line shows the booked price', () => {
    // add-to-cart builds the local line from `price_discount` on the same
    // object it books `net_price` from (payloadForCart / __cartMeta).
    const cartPd = buildCartPriceData(divergent());
    expect(cartPd.price_discount).toBe(bookedPrice(cartPd));
  });

  it('a promo-wins row stays consistent too', () => {
    const pd = priceData(
      7.18,
      [
        offer({
          promo_code: 'A',
          promo_net_price: 3.95,
          promo_qty_required: 1,
        }),
      ],
      12,
      { price_discount: 5.5 } as Partial<ErpPriceData>,
    );
    const cartPd = buildCartPriceData(pd);
    const effective = selectBestPrice(pd).effectivePrice;

    expect(effective).toBe(3.95);
    expect(cartPd.net_price).toBe(effective);
    expect(cartPd.price_discount).toBe(effective);
    expect(netOf(cartPd)).toBe(bookedPrice(cartPd));
  });
});
