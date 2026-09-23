import { describe, it, expect } from 'vitest';
import { mapCSOrderToSummary } from '@utils/adapter/cart-adapter';

describe('mapCSOrderToSummary — price precision', () => {
  it('carries the order price_decimals', () => {
    expect(
      mapCSOrderToSummary({ order_id: 'O', price_decimals: 4 }).priceDecimals,
    ).toBe(4);
  });
  it('defaults to 2 decimals', () => {
    expect(mapCSOrderToSummary({ order_id: 'O' }).priceDecimals).toBe(2);
  });
});
