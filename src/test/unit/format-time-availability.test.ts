import { describe, it, expect } from 'vitest';
import { formatTimeAvailability } from '@/components/themes/time/product/format-time-availability';
import type { ErpPriceData } from '@utils/transform/erp-prices';

// Minimal translator stub: returns the provided defaultValue.
const t = (_key: string, opts?: { defaultValue?: string }) =>
  opts?.defaultValue ?? _key;

const price = (p: Partial<ErpPriceData>): ErpPriceData => p as ErpPriceData;

describe('formatTimeAvailability', () => {
  it('out of stock → ok:false with ERP label when present', () => {
    const r = formatTimeAvailability(
      price({
        availability: 0,
        product_label_action: { LABEL: 'Esaurito' } as any,
      }),
      'exact',
      t,
    );
    expect(r).toEqual({ ok: false, label: 'Esaurito' });
  });

  it('out of stock without ERP label → falls back to text-out-stock', () => {
    const r = formatTimeAvailability(price({ availability: 0 }), 'in_out', t);
    expect(r).toEqual({ ok: false, label: 'Non disponibile' });
  });

  it('null/undefined priceData → out of stock', () => {
    expect(formatTimeAvailability(undefined, 'exact', t)).toEqual({
      ok: false,
      label: 'Non disponibile',
    });
    expect(formatTimeAvailability(null, 'exact', t)).toEqual({
      ok: false,
      label: 'Non disponibile',
    });
  });

  it('in stock + in_out mode → binary label only (no number)', () => {
    const r = formatTimeAvailability(
      price({
        availability: 47,
        packaging_option_default: { packaging_uom: 'PA' } as any,
      }),
      'in_out',
      t,
    );
    expect(r).toEqual({ ok: true, label: 'Disponibile' });
  });

  it('in stock + exact mode → label with the exact number and dynamic UOM', () => {
    const r = formatTimeAvailability(
      price({
        availability: 47,
        packaging_option_default: { packaging_uom: 'PA' } as any,
      }),
      'exact',
      t,
    );
    expect(r).toEqual({ ok: true, label: 'Disponibile · 47 PA' });
  });

  it('exact mode without a UOM → number only, no trailing space', () => {
    const r = formatTimeAvailability(price({ availability: 12 }), 'exact', t);
    expect(r).toEqual({ ok: true, label: 'Disponibile · 12' });
  });

  it('exact mode coerces string availability and treats <= 0 as out of stock', () => {
    expect(
      formatTimeAvailability(price({ availability: '8' as any }), 'exact', t),
    ).toEqual({ ok: true, label: 'Disponibile · 8' });
    expect(
      formatTimeAvailability(price({ availability: -3 }), 'exact', t),
    ).toEqual({ ok: false, label: 'Non disponibile' });
  });

  // --- blank label = "no text, just the coloured pin" ----------------------
  // Every pill surface renders a coloured dot + a text span, so an empty label
  // leaves the dot alone. Blanking a case label in erp_settings is therefore
  // how a tenant opts into a dot-only pill. A MISSING product_label_action is
  // NOT the same thing (no ERP data yet) and must keep its fallback text.

  it('out of stock with a deliberately blank ERP label → no text', () => {
    const r = formatTimeAvailability(
      price({ availability: 0, product_label_action: { LABEL: '' } as any }),
      'exact',
      t,
    );
    expect(r).toEqual({ ok: false, label: '' });
  });

  it('treats a whitespace-only ERP label as blank', () => {
    const r = formatTimeAvailability(
      price({ availability: 0, product_label_action: { LABEL: '   ' } as any }),
      'in_out',
      t,
    );
    expect(r).toEqual({ ok: false, label: '' });
  });

  it('in stock + blank label + in_out → no text', () => {
    const r = formatTimeAvailability(
      price({
        availability: 47,
        product_label_action: { LABEL: '' } as any,
        packaging_option_default: { packaging_uom: 'PA' } as any,
      }),
      'in_out',
      t,
    );
    expect(r).toEqual({ ok: true, label: '' });
  });

  it('in stock + blank label + exact → keeps the quantity, drops the word', () => {
    const r = formatTimeAvailability(
      price({
        availability: 47,
        product_label_action: { LABEL: '' } as any,
        packaging_option_default: { packaging_uom: 'PA' } as any,
      }),
      'exact',
      t,
    );
    expect(r).toEqual({ ok: true, label: '47 PA' });
  });

  it('in stock + blank label + exact, no UOM → bare quantity', () => {
    const r = formatTimeAvailability(
      price({ availability: 12, product_label_action: { LABEL: '' } as any }),
      'exact',
      t,
    );
    expect(r).toEqual({ ok: true, label: '12' });
  });

  it('a configured label still wins — blanking is opt-in, not the default', () => {
    const r = formatTimeAvailability(
      price({
        availability: 47,
        product_label_action: { LABEL: 'Disponibile' } as any,
        packaging_option_default: { packaging_uom: 'PA' } as any,
      }),
      'exact',
      t,
    );
    expect(r).toEqual({ ok: true, label: 'Disponibile \u00b7 47 PA' });
  });
});
