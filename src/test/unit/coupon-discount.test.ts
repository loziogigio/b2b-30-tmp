import { describe, it, expect } from 'vitest';
import { applyCouponDiscount } from '@/lib/coupon/discount';

describe('applyCouponDiscount', () => {
  it('returns inputs unchanged for a zero / missing percent', () => {
    expect(applyCouponDiscount({ net: 100, vat: 22 }, 0)).toEqual({ net: 100, vat: 22, doc: 122, discount: 0 });
    expect(applyCouponDiscount({ net: 100, vat: 22 })).toEqual({ net: 100, vat: 22, doc: 122, discount: 0 });
  });

  it('reduces net + vat by the percent and reports the discount amount', () => {
    const r = applyCouponDiscount({ net: 100, vat: 22 }, 10);
    expect(r.net).toBeCloseTo(90);
    expect(r.vat).toBeCloseTo(19.8);
    expect(r.doc).toBeCloseTo(109.8);
    expect(r.discount).toBeCloseTo(12.2); // (100+22) * 10%
  });

  it('clamps a negative or >100 percent to a sane range', () => {
    expect(applyCouponDiscount({ net: 100, vat: 0 }, -5).net).toBe(100);
    expect(applyCouponDiscount({ net: 100, vat: 0 }, 150).net).toBe(0);
  });
});
