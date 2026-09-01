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

  // --- combinations the original ladder left uncovered -------------------
  // Every branch for cases 1-4 required isManagedSupplierOrder, and case 5
  // required BOTH flags false, so (subs=true, supplier=false) matched nothing
  // and fell through to 'UNKNOWN'. That is exactly the erp_settings blueprint
  // default, and what bellieforti-com / baseprotection-com run in production.
  const allCases = {
    '0': { label: 'Available', addToCart: true },
    '1': { label: 'Sub+Arrival', addToCart: true },
    '2': { label: 'Substitute', addToCart: true },
    '3': { label: 'Arriving', addToCart: true },
    '4': { label: 'Unavailable', addToCart: false },
    '5': { label: 'Unmanaged', addToCart: false },
  };

  it('case 4: no stock, subs managed, supplier NOT managed, no substitute', () => {
    const r = getLabelAndCartStatus(0, [], [], {
      isManagedSubstitutes: true, isManagedSupplierOrder: false, cases: allCases,
    });
    expect(r.case).toBe(4);
    expect(r.LABEL).toBe('Unavailable');
    expect(r.ADD_TO_CART).toBe(false);
  });

  it('case 2: no stock, subs managed, supplier NOT managed, substitute exists', () => {
    const r = getLabelAndCartStatus(0, [{ x: 1 }], [], {
      isManagedSubstitutes: true, isManagedSupplierOrder: false, cases: allCases,
    });
    expect(r.case).toBe(2);
    expect(r.LABEL).toBe('Substitute');
  });

  it('case 3: no stock, supplier managed, subs NOT managed, arrival exists', () => {
    const r = getLabelAndCartStatus(0, [], [{ y: 1 }], {
      isManagedSubstitutes: false, isManagedSupplierOrder: true, cases: allCases,
    });
    expect(r.case).toBe(3);
    expect(r.LABEL).toBe('Arriving');
  });

  it('case 4: no stock, supplier managed, subs NOT managed, no arrival', () => {
    const r = getLabelAndCartStatus(0, [], [], {
      isManagedSubstitutes: false, isManagedSupplierOrder: true, cases: allCases,
    });
    expect(r.case).toBe(4);
    expect(r.LABEL).toBe('Unavailable');
  });

  it('ignores a substitute when substitutes are not managed', () => {
    const r = getLabelAndCartStatus(0, [{ x: 1 }], [], {
      isManagedSubstitutes: false, isManagedSupplierOrder: true, cases: allCases,
    });
    expect(r.case).toBe(4);
  });
});
