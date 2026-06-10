import { describe, it, expect } from 'vitest';
import {
  vincStatusLabel,
  typeToVincStatus,
  vincOrderToSummary,
  vincOrderDetailToTransformed,
} from '@/utils/transform/vinc-historical-order';

const rec = {
  _id: '6a18e8a54eae3b148980919a',
  relation_id: '015892',
  data: {
    document_number: 'OC/10760',
    document_date: '2026-05-28T00:00:00.000Z',
    delivery_date: null,
    status: 'fulfilled',
    total: 291.55,
    currency: 'EUR',
    subtotal: 250,
    vat_total: 41.55,
    shipping_cost: 0,
    discount_total: 0,
    payment_method: 'RB',
    agent_code: 'A1',
    notes: 'leave at gate',
    shipping_address: {
      code: '1',
      label: 'SEDE',
      street: 'VIA FIEGHI 1',
      city: 'SALA CONSILINA',
      province: 'SA',
      postal_code: '84036',
      country: 'IT',
    },
    erp_meta: { csoci: 'X' },
    items: [
      {
        line_number: 1,
        sku: 'ART1',
        entity_code: '529836',
        name: 'Widget',
        quantity: 2,
        qty_consegnata: 2,
        uom: 'PZ',
        unit_price: 125,
        discounts_json: '[10,5]',
        vat_rate: 22,
        line_total: 250,
        val_consegnato: 250,
      },
    ],
  },
};

describe('vincStatusLabel', () => {
  it('maps known statuses to Italian labels', () => {
    expect(vincStatusLabel('fulfilled')).toBe('Evaso');
    expect(vincStatusLabel('to_fulfill')).toBe('Da evadere');
    expect(vincStatusLabel('in_transit')).toBe('In consegna');
  });
  it('falls back to the raw value when unknown', () => {
    expect(vincStatusLabel('weird')).toBe('weird');
    expect(vincStatusLabel(undefined)).toBe('');
  });
});

describe('typeToVincStatus', () => {
  it('maps ERP filter chips to VINC statuses', () => {
    expect(typeToVincStatus('T')).toBeUndefined(); // Tutti → no filter
    expect(typeToVincStatus('NE')).toBe('to_fulfill'); // Da evadere
    expect(typeToVincStatus('E')).toBe('fulfilled'); // Evaso
    expect(typeToVincStatus('IA')).toBe('to_fulfill'); // In accettazione
  });
});

describe('vincOrderToSummary', () => {
  it('maps a VINC record to OrderSummary with source=vinc', () => {
    const s = vincOrderToSummary(rec);
    expect(s.id).toBe(rec._id);
    expect(s.vincId).toBe(rec._id);
    expect(s.source).toBe('vinc');
    expect(s.document).toBe('OC/10760');
    expect(s.ordered_total).toBe(291.55);
    expect(s.status_code).toBe('fulfilled');
    expect(s.status_label).toBe('Evaso');
    expect(s.destination).toContain('SEDE');
  });

  it('falls back to street+city when label is missing', () => {
    const s = vincOrderToSummary({
      ...rec,
      data: {
        ...rec.data,
        shipping_address: { street: 'VIA X', city: 'ROMA' },
      },
    });
    expect(s.destination).toBe('VIA X - ROMA');
  });
});

describe('vincOrderDetailToTransformed', () => {
  it('enriches with totals, currency, status, per-line VAT/discounts', () => {
    const o = vincOrderDetailToTransformed(rec);
    expect(o.currency).toBe('EUR');
    expect(o.total).toBe(291.55);
    expect(o.subtotal).toBe(250);
    expect(o.vatTotal).toBe(41.55);
    expect(o.statusLabel).toBe('Evaso');
    expect(o.paymentMethod).toBe('RB');
    expect(o.shipping_address.state).toBe('SA');
    expect(o.shipping_address.zip).toBe('84036');
    const it = o.items[0];
    expect(it.sku).toBe('ART1');
    expect(it.uom).toBe('PZ');
    expect(it.discounts).toEqual([10, 5]);
    expect(it.vatRate).toBe(22);
    expect(it.lineTotal).toBe(250);
    // delivered (consegnato) breakdown
    expect(it.ordered_in_quantity).toBe(2);
    expect(it.delivered_in_quantity).toBe(2);
    expect(it.delivered_in_price).toBe(250);
  });

  it('parses discounts_json safely (bad JSON → [])', () => {
    const o = vincOrderDetailToTransformed({
      ...rec,
      data: {
        ...rec.data,
        items: [{ ...rec.data.items[0], discounts_json: 'nope' }],
      },
    });
    expect(o.items[0].discounts).toEqual([]);
  });
});
