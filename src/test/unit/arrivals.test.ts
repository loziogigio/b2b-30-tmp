import { describe, expect, it } from 'vitest';
import {
  asArrivalDisplay,
  dmyToIso,
  formatArrival,
  formatIsoDateDisplay,
  isoWeekNumber,
  pickErpArrival,
  pickNextArrival,
  arrivalSourceFromPricing,
} from '@utils/arrivals';

const TODAY = '2026-08-20';

describe('pickNextArrival', () => {
  it('takes the earliest delivery that has not happened yet', () => {
    const arrivals = [
      { eta: '2026-09-15', qty: 40 },
      { eta: '2026-08-30', qty: 86 },
    ];
    expect(pickNextArrival(arrivals, TODAY)?.eta).toBe('2026-08-30');
  });

  it('does not depend on the importer sorting correctly', () => {
    const arrivals = [{ eta: '2026-12-01' }, { eta: '2026-08-25' }];
    expect(pickNextArrival(arrivals, TODAY)?.eta).toBe('2026-08-25');
  });

  it('includes a delivery due today', () => {
    expect(pickNextArrival([{ eta: TODAY }], TODAY)?.eta).toBe(TODAY);
  });

  it('ignores dates already past, so a stale sync shows nothing', () => {
    expect(pickNextArrival([{ eta: '2026-08-19' }], TODAY)).toBeNull();
    expect(pickNextArrival([{ eta: '2020-01-01' }], TODAY)).toBeNull();
  });

  it('returns null for every absent or malformed shape', () => {
    expect(pickNextArrival(undefined, TODAY)).toBeNull();
    expect(pickNextArrival([], TODAY)).toBeNull();
    expect(pickNextArrival('2026-08-30', TODAY)).toBeNull();
    expect(pickNextArrival([{ eta: '30/08/2026' }], TODAY)).toBeNull();
    expect(pickNextArrival([{ eta: null }, {}], TODAY)).toBeNull();
  });
});

describe('isoWeekNumber', () => {
  it('matches ISO-8601 week numbering', () => {
    expect(isoWeekNumber('2026-09-02')).toBe(36);
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    // 2027-01-01 is a Friday, so it belongs to week 53 of 2026.
    expect(isoWeekNumber('2027-01-01')).toBe(53);
    // 2026-01-04 is a Sunday — still week 1, not week 2.
    expect(isoWeekNumber('2026-01-04')).toBe(1);
    expect(isoWeekNumber('2026-01-05')).toBe(2);
  });

  it('returns null for a non-ISO string', () => {
    expect(isoWeekNumber('30/08/2026')).toBeNull();
    expect(isoWeekNumber('')).toBeNull();
  });
});

describe('formatIsoDateDisplay', () => {
  it('reformats without ever building a Date', () => {
    // new Date('2026-01-01') is UTC midnight and renders as 31/12 west of UTC.
    expect(formatIsoDateDisplay('2026-01-01')).toBe('01/01/2026');
    expect(formatIsoDateDisplay('2026-08-30')).toBe('30/08/2026');
  });

  it('returns null for junk', () => {
    expect(formatIsoDateDisplay('nope')).toBeNull();
  });
});

describe('dmyToIso', () => {
  it('converts the ERP shape', () => {
    expect(dmyToIso('30/08/2026')).toBe('2026-08-30');
  });

  it('rejects anything else', () => {
    expect(dmyToIso('2026-08-30')).toBeNull();
    expect(dmyToIso(undefined)).toBeNull();
  });
});

describe('pickErpArrival', () => {
  const withRows = (rows: any[]) => ({
    product_label_action: { order_supplier_available: rows },
  });

  it('reads dd/mm/yyyy rows and keeps the supplier week', () => {
    const out = pickErpArrival(
      withRows([
        { DataArrivoPrevista: '02/09/2026', NumeroDellaSettimana: 36 },
      ]),
      TODAY,
    );
    expect(out).toEqual({ eta: '2026-09-02', week: 36 });
  });

  it('picks the earliest future row across mixed field names', () => {
    const out = pickErpArrival(
      withRows([
        { expected_date: '2026-12-01' },
        { confirmed_date: '25/08/2026' },
      ]),
      TODAY,
    );
    expect(out?.eta).toBe('2026-08-25');
  });

  it('skips rows already in the past', () => {
    expect(
      pickErpArrival(withRows([{ expected_date: '01/01/2020' }]), TODAY),
    ).toBeNull();
  });

  it('tolerates the two legacy misspelled top-level keys', () => {
    expect(
      pickErpArrival(
        { order_suplier_available: [{ expected_date: '2026-08-25' }] },
        TODAY,
      )?.eta,
    ).toBe('2026-08-25');
    expect(
      pickErpArrival(
        { order_supplier_available: [{ expected_date: '2026-08-26' }] },
        TODAY,
      )?.eta,
    ).toBe('2026-08-26');
  });

  it('reads the NORMALISED shape transformErpPricesResponse actually emits', () => {
    // This is the shape that reaches production: mapSupplierArrivals renames
    // DataArrivoPrevista -> expected_date and NumeroDellaSettimana ->
    // week_number. Reading only the raw names loses the supplier's own week and
    // silently derives one from the date instead.
    const out = pickErpArrival(
      withRows([
        {
          article_code: '020945',
          expected_date: '2026-09-02',
          confirmed_date: undefined,
          week_number: 36,
          expected_qty: 86,
        },
      ]),
      TODAY,
    );
    expect(out).toEqual({ eta: '2026-09-02', week: 36 });
  });

  it('returns null when there is no ERP payload at all', () => {
    expect(pickErpArrival(undefined, TODAY)).toBeNull();
    expect(pickErpArrival({}, TODAY)).toBeNull();
  });
});

describe('formatArrival', () => {
  const pim = [{ eta: '2026-09-02', qty: 5 }];

  it('renders the ISO week by default', () => {
    expect(
      formatArrival({
        arrivals: pim,
        mode: 'week',
        source: 'erp_pim',
        today: TODAY,
      }),
    ).toEqual({
      mode: 'week',
      week: 36,
    });
  });

  it('renders the exact date when asked', () => {
    expect(
      formatArrival({
        arrivals: pim,
        mode: 'date',
        source: 'erp_pim',
        today: TODAY,
      }),
    ).toEqual({
      mode: 'date',
      date: '02/09/2026',
    });
  });

  it('prefers the ERP over the PIM list', () => {
    const erp = {
      product_label_action: {
        order_supplier_available: [{ expected_date: '25/08/2026' }],
      },
    };
    expect(
      formatArrival({
        arrivals: pim,
        erpPriceData: erp,
        mode: 'date',
        source: 'erp_pim',
        today: TODAY,
      }),
    ).toEqual({
      mode: 'date',
      date: '25/08/2026',
    });
  });

  it("uses the supplier's own week number rather than deriving one", () => {
    // Deliberately inconsistent: the ERP says week 40 for a date in week 36.
    // The supplier's statement wins — that is what the customer was promised.
    const erp = {
      product_label_action: {
        order_supplier_available: [
          { expected_date: '02/09/2026', NumeroDellaSettimana: 40 },
        ],
      },
    };
    expect(
      formatArrival({
        arrivals: pim,
        erpPriceData: erp,
        mode: 'week',
        source: 'erp_pim',
        today: TODAY,
      }),
    ).toEqual({
      mode: 'week',
      week: 40,
    });
  });

  it('falls back to the PIM list when the ERP has nothing', () => {
    expect(
      formatArrival({
        arrivals: pim,
        erpPriceData: {},
        mode: 'week',
        source: 'erp_pim',
        today: TODAY,
      }),
    ).toEqual({
      mode: 'week',
      week: 36,
    });
  });

  it('returns null when neither source has a future date', () => {
    expect(
      formatArrival({
        arrivals: [{ eta: '2020-01-01' }],
        erpPriceData: {},
        mode: 'week',
        source: 'erp_pim',
        today: TODAY,
      }),
    ).toBeNull();
    expect(
      formatArrival({ mode: 'week', source: 'erp_pim', today: TODAY }),
    ).toBeNull();
  });
});

describe('asArrivalDisplay', () => {
  it('defaults to week for anything unrecognised', () => {
    expect(asArrivalDisplay('date')).toBe('date');
    expect(asArrivalDisplay('week')).toBe('week');
    expect(asArrivalDisplay(undefined)).toBe('week');
    expect(asArrivalDisplay('exact')).toBe('week');
  });
});

describe('arrivalSourceFromPricing', () => {
  it('follows the tenant pricing source rather than a setting of its own', () => {
    expect(arrivalSourceFromPricing('erp')).toBe('erp');
    expect(arrivalSourceFromPricing('hybrid')).toBe('erp_pim');
    expect(arrivalSourceFromPricing('inline')).toBe('pim');
    // Unknown/absent behaves like inline, matching DEFAULT_PRICING_SOURCE.
    expect(arrivalSourceFromPricing(undefined)).toBe('pim');
  });
});

describe('formatArrival honours the source', () => {
  const pim = [{ eta: '2026-09-02' }];
  const erp = {
    product_label_action: {
      order_supplier_available: [{ expected_date: '25/08/2026' }],
    },
  };

  it('ignores the PIM list on an ERP-priced tenant', () => {
    expect(
      formatArrival({
        arrivals: pim,
        mode: 'date',
        source: 'erp',
        today: TODAY,
      }),
    ).toBeNull();
  });

  it('ignores the ERP payload on an inline-priced tenant', () => {
    expect(
      formatArrival({
        arrivals: pim,
        erpPriceData: erp,
        mode: 'date',
        source: 'pim',
        today: TODAY,
      }),
    ).toEqual({ mode: 'date', date: '02/09/2026' });
  });

  it('lets the ERP win, then falls back, on a hybrid tenant', () => {
    expect(
      formatArrival({
        arrivals: pim,
        erpPriceData: erp,
        mode: 'date',
        source: 'erp_pim',
        today: TODAY,
      }),
    ).toEqual({ mode: 'date', date: '25/08/2026' });
    expect(
      formatArrival({
        arrivals: pim,
        erpPriceData: {},
        mode: 'date',
        source: 'erp_pim',
        today: TODAY,
      }),
    ).toEqual({ mode: 'date', date: '02/09/2026' });
  });
});
