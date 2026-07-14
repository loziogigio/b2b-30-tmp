import { describe, it, expect } from 'vitest';
import { mapCSOrderToSummary } from '@utils/adapter/cart-adapter';

/** Mirrors the delivery_info the on-cart-create hook actually writes. */
const order = (deliveryInfo: Record<string, unknown>) => ({
  order_id: 'ORD1',
  customer_code: '1001',
  subtotal_net: 860,
  subtotal_gross: 1000,
  total_vat: 189.2,
  order_total: 1049.2,
  erp_data: { delivery_info: deliveryInfo },
});

describe('mapCSOrderToSummary — minimum order', () => {
  it('reads the minimum from the key the ERP hook actually writes', () => {
    const s = mapCSOrderToSummary(
      order({
        importo_minimo: 1200,
        importo_minimo_zero_spese: 1500,
        shipping_cost: 15,
      }),
    );
    expect(s.minOrder?.minimumAmount).toBe(1200);
    expect(s.transportFreeAbove).toBe(1500);
    expect(s.transportCost).toBe(15);
  });

  it('leaves minOrder undefined when no minimum is configured', () => {
    expect(
      mapCSOrderToSummary(order({ importo_minimo: 0 })).minOrder,
    ).toBeUndefined();
    expect(mapCSOrderToSummary(order({})).minOrder).toBeUndefined();
  });

  it('does not crash when erp_data is absent', () => {
    const s = mapCSOrderToSummary({ order_id: 'X', customer_code: '1' });
    expect(s.minOrder).toBeUndefined();
    expect(s.transportFreeAbove).toBe(0);
  });
});

/**
 * The gate the checkout applies. Kept as a pure helper so the arithmetic is
 * testable without mounting the cart.
 */
import { minOrderStatus } from '@utils/adapter/cart-adapter';

describe('minOrderStatus', () => {
  it('blocks below the threshold and reports the shortfall', () => {
    expect(minOrderStatus(860, 1200)).toEqual({
      belowMinimum: true,
      shortfall: 340,
    });
  });

  it('treats an exactly-met threshold as compliant', () => {
    expect(minOrderStatus(1200, 1200)).toEqual({
      belowMinimum: false,
      shortfall: 0,
    });
  });

  it('never blocks when no minimum is configured', () => {
    expect(minOrderStatus(0, 0)).toEqual({ belowMinimum: false, shortfall: 0 });
    expect(minOrderStatus(50, 0)).toEqual({
      belowMinimum: false,
      shortfall: 0,
    });
  });

  it('never reports a negative shortfall', () => {
    expect(minOrderStatus(5000, 1200)).toEqual({
      belowMinimum: false,
      shortfall: 0,
    });
  });

  // totalNet is a server-side SUM OF LINE TOTALS, so an arithmetically exact
  // minimum can land a few units of floating-point epsilon away from the
  // threshold (e.g. 1199.9999999996 instead of 1200). The boundary must be
  // INCLUSIVE — a cart that is truly at the minimum must never be blocked.
  it('treats a float-epsilon-below-threshold total as compliant (no float-artifact lockout)', () => {
    expect(minOrderStatus(1199.9999999996, 1200)).toEqual({
      belowMinimum: false,
      shortfall: 0,
    });
  });

  it('treats a float-epsilon-above-threshold total as compliant', () => {
    expect(minOrderStatus(1200.0000000001, 1200)).toEqual({
      belowMinimum: false,
      shortfall: 0,
    });
  });

  it('a genuine shortfall still blocks and reports a clean 2dp value', () => {
    expect(minOrderStatus(860, 1200)).toEqual({
      belowMinimum: true,
      shortfall: 340,
    });
  });

  it('does not block on a sub-cent shortfall', () => {
    // Short by 0.003 — less than half a cent, so it must round away to 0.
    expect(minOrderStatus(1199.997, 1200)).toEqual({
      belowMinimum: false,
      shortfall: 0,
    });
  });
});
