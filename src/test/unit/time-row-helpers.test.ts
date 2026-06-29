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

  it('netOf prefers discount, then net, then gross; ignores non-positive', () => {
    expect(netOf({ price_discount: 5 } as any)).toBe(5);
    expect(netOf({ net_price: 7 } as any)).toBe(7);
    expect(netOf({ gross_price: 9 } as any)).toBe(9);
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
