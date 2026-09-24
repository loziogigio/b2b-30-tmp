/**
 * Served-view vectors, shared byte-identical with the Commerce Suite price
 * gate (vinc-commerce-suite src/test/fixtures/served-pricing-vectors.json).
 *
 * Each vector carries the product exactly as Commerce Suite search SERVES it
 * to a customer (`served` — promotions projected and re-priced, unit prices
 * derived, tier-filtered) and what the storefront books from it
 * (`expected`). The gate pins that it expects the same prices from the same
 * view; this side books `served` through the real booking functions.
 */
import { describe, it, expect } from 'vitest';
import vectors from '../fixtures/served-pricing-vectors.json';
import { diffCartPrices } from '@/lib/cart/price-check';
import {
  buildAddItemRequest,
  mapCSLineItemToItem,
} from '@utils/adapter/cart-adapter';
import { transformPimProduct } from '@framework/product/get-pim-product';
import { productToErpPriceData } from '@utils/transform/inline-to-erp';
import { buildAddPayload } from '@components/product/add-to-cart';
import {
  buildListinoPriceData,
  buildPromoPriceData,
} from '@components/product/b2b-offer-rows';
import type { ErpPriceData, PromoOffer } from '@utils/transform/erp-prices';

interface ServedVector {
  name: string;
  tags: string[];
  raw: any;
  served: any;
  expected: {
    listino_unit_price: number | null;
    promos: Array<{
      promo_code: string;
      promo_row: number;
      unit_price: number;
    }>;
  };
}

/** Inside every vector's promotion window. */
const NOW = new Date('2026-09-23T10:00:00Z');

/** Both sides compare prices at the order's precision (default 2 decimals). */
const at2 = (n: number) => Math.round(n * 100) / 100;

const priceDataOf = (v: ServedVector): ErpPriceData | null =>
  productToErpPriceData(transformPimProduct(v.served));

const listinoBooking = (code: string, pd: ErpPriceData) => {
  const priceData = buildListinoPriceData(pd);
  return buildAddPayload({
    itemId: code,
    qty: Number(priceData.packaging_option_default?.qty_x_packaging ?? 1),
    priceData,
  });
};

const promoBooking = (code: string, pd: ErpPriceData, offer: PromoOffer) => {
  const priceData = buildPromoPriceData(pd, offer);
  return buildAddPayload({
    itemId: code,
    qty: Number(priceData.packaging_option_default?.qty_x_packaging ?? 1),
    priceData,
    promo_code: offer.promo_code,
    promo_row: offer.promo_row,
  });
};

const offerFor = (
  pd: ErpPriceData,
  promo: { promo_code: string; promo_row: number },
): PromoOffer | undefined =>
  (pd.all_promo_offers ?? []).find(
    (o) =>
      String(o.promo_code) === promo.promo_code &&
      Number(o.promo_row) === promo.promo_row,
  );

/** A booking as Commerce Suite stores it and the cart reads it back, stored
 *  at `unitPrice`. */
const storedLine = (
  payload: ReturnType<typeof buildAddPayload>,
  lineNumber: number,
  unitPrice: number,
) =>
  mapCSLineItemToItem({
    ...buildAddItemRequest(payload as any),
    unit_price: unitPrice,
    line_number: lineNumber,
  });

describe('served-pricing vectors (same file as the CS gate)', () => {
  for (const v of vectors as ServedVector[]) {
    const code = String(v.served.entity_code);

    describe(v.name, () => {
      if (v.expected.listino_unit_price == null) {
        it('is not priced for the customer, so a listino line reads not sellable', () => {
          expect(priceDataOf(v)).toBeNull();
          const leftover = mapCSLineItemToItem({
            line_number: 10,
            entity_code: code,
            sku: code,
            name: code,
            quantity: 1,
            unit_price: 1,
            list_price: 1,
            vat_rate: 22,
            product_source: 'pim',
            discounts: [],
          });
          expect(
            diffCartPrices([leftover], {}, { now: NOW, decimals: 2 }).anomalies,
          ).toEqual([
            expect.objectContaining({
              IdRiga: 10,
              IsArticoloNonVendibile: true,
            }),
          ]);
        });
        return;
      }
      const listinoUnit = v.expected.listino_unit_price;

      it('books the listino at the expected unit price', () => {
        const pd = priceDataOf(v)!;
        expect(pd).not.toBeNull();
        expect(at2(listinoBooking(code, pd).price_discount)).toBe(
          at2(listinoUnit),
        );
      });

      it('books every expected promotion at its unit price', () => {
        const pd = priceDataOf(v)!;
        for (const p of v.expected.promos) {
          const offer = offerFor(pd, p);
          expect(offer, `${p.promo_code}/${p.promo_row}`).toBeDefined();
          expect(at2(promoBooking(code, pd, offer!).price_discount)).toBe(
            at2(p.unit_price),
          );
        }
      });

      it('finds nothing to fix on lines booked at those prices', () => {
        const pd = priceDataOf(v)!;
        const lines = [
          storedLine(listinoBooking(code, pd), 10, listinoUnit),
          ...v.expected.promos.map((p, i) =>
            storedLine(
              promoBooking(code, pd, offerFor(pd, p)!),
              20 + 10 * i,
              p.unit_price,
            ),
          ),
        ];
        expect(
          diffCartPrices(lines, { [code]: pd }, { now: NOW, decimals: 2 })
            .anomalies,
        ).toEqual([]);
      });
    });
  }
});
