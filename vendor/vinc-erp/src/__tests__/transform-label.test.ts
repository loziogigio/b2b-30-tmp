import { describe, it, expect } from 'vitest';
import { getLabelAndCartStatus } from '../mymb/transform.js';

const cases = {
  '0': { label: 'Available', addToCart: true },
  '1': { label: 'Sub+Arrival', addToCart: true },
  '4': { label: 'Unavailable', addToCart: false },
  '5': { label: 'Unmanaged', addToCart: false },
};

describe('getLabelAndCartStatus', () => {
  it('case 0 when quantity available', () => {
    const r = getLabelAndCartStatus(5, [], [], {
      isManagedSubstitutes: true, isManagedSupplierOrder: true, cases,
    });
    expect(r.case).toBe(0);
    expect(r.LABEL).toBe('Available');
    expect(r.ADD_TO_CART).toBe(true);
    expect(r.quantity_available).toBe(5);
  });

  it('case 1: no stock, managed subs+supplier, both present', () => {
    const r = getLabelAndCartStatus(0, [{ x: 1 }], [{ y: 1 }], {
      isManagedSubstitutes: true, isManagedSupplierOrder: true, cases,
    });
    expect(r.case).toBe(1);
    expect(r.LABEL).toBe('Sub+Arrival');
  });

  it('case 5: no stock, nothing managed', () => {
    const r = getLabelAndCartStatus(0, [], [], {
      isManagedSubstitutes: false, isManagedSupplierOrder: false, cases,
    });
    expect(r.case).toBe(5);
    expect(r.ADD_TO_CART).toBe(false);
  });

  it('UNKNOWN fallback when matched case has no config entry', () => {
    const r = getLabelAndCartStatus(0, [], [{ y: 1 }], {
      isManagedSubstitutes: true, isManagedSupplierOrder: true, cases,
    }); // → case 3, not in `cases`
    expect(r.case).toBe(3);
    expect(r.LABEL).toBe('UNKNOWN');
    expect(r.ADD_TO_CART).toBe(false);
  });
});
