import { describe, it, expect } from 'vitest';
import {
  netOf,
  listOf,
  fmtEuro,
  C,
} from '@/components/themes/time/product/time-row-helpers';

describe('time-row-helpers', () => {
  it('fmtEuro formats with the € prefix and fixed decimals', () => {
    expect(fmtEuro(12.5, 2)).toBe('€12.50');
    expect(fmtEuro(12, 0)).toBe('€12');
  });

  it('netOf returns the price the cart BOOKS — the listino, or a cheaper qualifying promo', () => {
    expect(netOf({ net_price: 7 } as any)).toBe(7);
    expect(
      netOf({
        net_price: 7,
        packaging_option_default: { qty_x_packaging: 1 },
        all_promo_offers: [{ promo_net_price: 4, promo_qty_required: 1 }],
      } as any),
    ).toBe(4);
  });

  it('netOf hides a price nothing books (no listino => €0 cart line => no price)', () => {
    // `price_discount` is the ERP's flattened pre-selected promo, and
    // `gross_price` is the MSRP — the booking layer reads NEITHER. Showing
    // them on a row with no listino would display a price that books as €0.
    expect(netOf({ price_discount: 5 } as any)).toBeNull();
    expect(netOf({ gross_price: 9 } as any)).toBeNull();
    expect(netOf({ net_price: 0, price_discount: 3.95 } as any)).toBeNull();
    expect(netOf({ net_price: 0 } as any)).toBeNull();
    expect(netOf(undefined)).toBeNull();
  });

  it('listOf reads price_gross then gross_price', () => {
    expect(listOf({ price_gross: 10 } as any)).toBe(10);
    expect(listOf({ gross_price: 11 } as any)).toBe(11);
    expect(listOf(undefined)).toBeNull();
  });

  it('C exposes the palette keys used by the rows', () => {
    expect(typeof C.ink).toBe('string');
    expect(typeof C.faint).toBe('string');
    expect(typeof C.panel).toBe('string');
  });
});
