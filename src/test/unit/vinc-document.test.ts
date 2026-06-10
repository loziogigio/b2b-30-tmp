import { describe, it, expect } from 'vitest';
import {
  isoToDmy,
  ddmmyyyyToIso,
  pickDirectUrl,
  vincDeliveryNoteToRow,
  vincInvoiceToRow,
} from '@/utils/transform/vinc-document';

describe('date helpers', () => {
  it('isoToDmy formats an ISO date to DD/MM/YYYY', () => {
    expect(isoToDmy('2026-05-28T00:00:00.000Z')).toBe('28/05/2026');
    expect(isoToDmy('2026-05-28')).toBe('28/05/2026');
    expect(isoToDmy('')).toBe('');
    expect(isoToDmy(undefined)).toBe('');
  });
  it('ddmmyyyyToIso converts DDMMYYYY to YYYY-MM-DD, undefined on bad input', () => {
    expect(ddmmyyyyToIso('28052026')).toBe('2026-05-28');
    expect(ddmmyyyyToIso('')).toBeUndefined();
    expect(ddmmyyyyToIso('nope')).toBeUndefined();
  });
});

describe('vincDeliveryNoteToRow', () => {
  const rec = {
    _id: 'd1',
    data: {
      numero_ddt: '12345',
      numero_documento: 'DDT/2026/12345',
      data: '2026-05-28T00:00:00.000Z',
      stato: 'shipped',
      destinazione: { label: 'SEDE', street: 'VIA X', city: 'ROMA' },
      totale: 100,
      pdf_url: 'https://cs/ddt.pdf',
      pdf_barcode_url: 'https://cs/ddt-bc.pdf',
    },
  };
  it('maps to a DDT DocumentRow with VINC urls', () => {
    const r = vincDeliveryNoteToRow(rec);
    expect(r.doc_type).toBe('DDT');
    expect(r.document).toBe('DDT/2026/12345');
    expect(r.number).toBe('12345');
    expect(r.destination).toBe('SEDE');
    expect(r.dateISO).toBe('2026-05-28');
    expect(r.date_label).toBe('28/05/2026');
    expect(r.pdf).toBe('/api/profile/document/delivery_note/d1?kind=pdf');
    expect(r.barcodePdf).toBe(
      '/api/profile/document/delivery_note/d1?kind=barcode',
    );
  });
  it('falls back to street+city when destinazione.label missing', () => {
    const r = vincDeliveryNoteToRow({
      ...rec,
      data: { ...rec.data, destinazione: { street: 'VIA X', city: 'ROMA' } },
    });
    expect(r.destination).toBe('VIA X - ROMA');
  });
  it('hides legacy non-http fallback strings (no broken link)', () => {
    const r = vincDeliveryNoteToRow({
      ...rec,
      data: { ...rec.data, pdf_url: 'BC/2026/9345/D', pdf_barcode_url: '' },
    });
    expect(r.pdf).toBeUndefined();
    expect(r.barcodePdf).toBeUndefined();
  });
});

describe('vincInvoiceToRow', () => {
  const rec = {
    _id: 'i1',
    data: {
      numero_fattura: '90540',
      numero_documento: 'F/2026/90540',
      data: '2026-05-28',
      destinazione: { label: 'SEDE' },
      totale: 200,
      pdf_url: 'https://cs/inv.pdf',
      pdf_barcode_url: 'https://cs/inv-bc.pdf',
      csv_url: 'https://cs/inv.csv',
    },
  };
  it('maps to an F DocumentRow with pdf/barcode/csv urls', () => {
    const r = vincInvoiceToRow(rec);
    expect(r.doc_type).toBe('F');
    expect(r.document).toBe('F/2026/90540');
    expect(r.number).toBe('90540');
    expect(r.pdf).toBe('/api/profile/document/invoice/i1?kind=pdf');
    expect(r.barcodePdf).toBe('/api/profile/document/invoice/i1?kind=barcode');
    expect(r.csv).toBe('/api/profile/document/invoice/i1?kind=csv');
  });
});

describe('pickDirectUrl', () => {
  it('selects the url for each action kind', () => {
    const row: any = { pdf: 'p', barcodePdf: 'b', csv: 'c' };
    expect(pickDirectUrl('pdf', row)).toBe('p');
    expect(pickDirectUrl('barcode', row)).toBe('b');
    expect(pickDirectUrl('csv', row)).toBe('c');
    expect(pickDirectUrl('pdf', {} as any)).toBeUndefined();
  });
});
