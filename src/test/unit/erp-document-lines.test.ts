import { describe, it, expect } from 'vitest';
import { mapErpDocRowsToLines } from '@utils/transform/erp-document-lines';

// Real row captured live from DFL ERP for DDT F/2026/75208 (irrelevant
// PrezzaturaImputata fields trimmed).
const dflRow = {
  IdRiga: 10,
  CodiceArticolo: '5010770',
  CodiceInternoArticolo: '525131',
  DescrizioneArticolo: 'DISCO LAMELLARE X AC/FER/AL D.115 GR.40',
  UMArticolo: 'PZ',
  Quantita: 10,
  Valore: [11.21, 2.47, 13.68], // [net, vat, gross]
  PrezzaturaImputata: { Prezzo: 2.49156, IVAPercentuale: 22 },
};

describe('mapErpDocRowsToLines', () => {
  it('maps a live DFL DDT row to a DocumentLine', () => {
    const [line] = mapErpDocRowsToLines([dflRow]);
    expect(line.lineNumber).toBe(10);
    expect(line.sku).toBe('5010770');
    expect(line.entityCode).toBe('525131'); // drives PIM EAN lookup
    expect(line.name).toBe('DISCO LAMELLARE X AC/FER/AL D.115 GR.40');
    expect(line.quantity).toBe(10);
    expect(line.uom).toBe('PZ');
    expect(line.lineTotal).toBe(11.21); // net = Valore[0]
    expect(line.unitPrice).toBeCloseTo(11.21 / 10, 5); // derived from line net
    expect(line.vatRate).toBe(22);
  });

  it('falls back to imputed unit price when quantity is zero', () => {
    const [line] = mapErpDocRowsToLines([
      { ...dflRow, Quantita: 0, Valore: [0, 0, 0] },
    ]);
    expect(line.unitPrice).toBeCloseTo(2.49156, 5);
  });

  it('uses CodiceInternoArticolo as entityCode, CodiceArticolo as sku', () => {
    const [line] = mapErpDocRowsToLines([
      { CodiceArticolo: 'AAA', CodiceInternoArticolo: 'BBB', Quantita: 1 },
    ]);
    expect(line.sku).toBe('AAA');
    expect(line.entityCode).toBe('BBB');
  });

  // Live row from Belli e Forti invoice VEN/2026/2555 (line 40) — the export
  // needs the list price and the six ScontoORicarica percentages the old
  // mapper dropped.
  it('carries the ERP list price and the six line discounts', () => {
    const [line] = mapErpDocRowsToLines([
      {
        ...dflRow,
        CodiceArticolo: 'BF00821',
        Quantita: 72,
        Valore: [74.88, 16.47, 91.35],
        PrezzaturaImputata: { Prezzo: 1.04, IVAPercentuale: 22 },
        ScontoORicarica1: 5,
        ScontoORicarica2: 2.5,
      },
    ]);
    expect(line.listPrice).toBe(1.04);
    expect(line.discounts).toEqual([5, 2.5, 0, 0, 0, 0]);
  });

  it('reports zeroed discounts and no list price when the ERP sends neither', () => {
    const [line] = mapErpDocRowsToLines([
      { CodiceArticolo: 'AAA', Quantita: 1, PrezzaturaImputata: null },
    ]);
    expect(line.listPrice).toBeUndefined();
    expect(line.discounts).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('handles null/empty input safely', () => {
    expect(mapErpDocRowsToLines(null)).toEqual([]);
    expect(mapErpDocRowsToLines(undefined)).toEqual([]);
    expect(mapErpDocRowsToLines([])).toEqual([]);
  });
});
