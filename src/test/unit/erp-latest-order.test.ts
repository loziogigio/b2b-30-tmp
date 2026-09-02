import { describe, it, expect } from 'vitest';
import { mapErpLatestOrderRows } from '@utils/transform/erp-latest-order';

// Real row captured live 2026-09-02 from a tenant MyMB instance:
//   GetUltimoOrdinatoClienteXArticolo
//     ?CodiceInternoCliente=5300        (a customer; commercial Codice 2649)
//     &CodiceInternoArticolo=53295      (SKU BF05003)
// These are exactly the values the legacy popup renders for that customer.
const liveRow = {
  CodicePadreVarianti: '',
  DataDecorrenza: '01/01/2024',
  DataRegistrazione: '/Date(1785448800000+0200)/',
  DataRegistrazioneString: '31/07/2026',
  PkRiga: {
    AnnoDocumento: 2026,
    CausaleDocumento: 'OC',
    ForzaInserimentoTestata: false,
    NotaDocumento: null,
    NumeroDocumento: 1110,
    NumeroRiga: 160,
  },
  PrezzaturaImputata_Prezzo: 1.52,
  PrezzaturaImputata_PrezzoInEuro: 0,
  PrezzaturaImputata_PrezzoInValuta: 0,
  PrezzaturaImputata_ScontiORicariche_ScontoORicarica1: 0.0,
  QuantitaConsegnata: 48,
  QuantitaOrdinata: 48,
  QuantitaResidua: 0,
  QuantitaSaldata: 0,
  // Always null on this endpoint — checked across 113 live rows, including
  // articles PIM lists with a unit. The UOM must come from the price data.
  UM: null,
  art_CodiceInterno: '53295',
};

// The only multi-row case in the whole sampled dataset (article 52661 ×
// customer 5300). Captured live; note the quantities do NOT reconcile
// arithmetically — 2148 ordered, 240 delivered, 0 residual.
const twoRows = [
  {
    ...liveRow,
    DataRegistrazioneString: '28/07/2026',
    PkRiga: {
      ...liveRow.PkRiga,
      AnnoDocumento: 2026,
      NumeroDocumento: 1095,
      NumeroRiga: 20,
    },
    QuantitaOrdinata: 2,
    QuantitaSaldata: 2,
    QuantitaConsegnata: 0,
    QuantitaResidua: 0,
    PrezzaturaImputata_Prezzo: 0.0001,
  },
  {
    ...liveRow,
    DataRegistrazioneString: '06/07/2026',
    PkRiga: {
      ...liveRow.PkRiga,
      AnnoDocumento: 2026,
      NumeroDocumento: 987,
      NumeroRiga: 20,
    },
    QuantitaOrdinata: 2148,
    QuantitaSaldata: 0,
    QuantitaConsegnata: 240,
    QuantitaResidua: 0,
    PrezzaturaImputata_Prezzo: 3.7,
  },
];

describe('mapErpLatestOrderRows', () => {
  it('maps the live captured row to the columns the popup shows', () => {
    const { rows } = mapErpLatestOrderRows([liveRow]);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row.date).toBe('31/07/2026');
    expect(row.causale).toBe('OC');
    expect(row.document).toBe('2026/1110');
    expect(row.lineNumber).toBe(160);
    expect(row.ordered).toBe(48);
    expect(row.settled).toBe(0);
    expect(row.delivered).toBe(48);
    expect(row.residual).toBe(0);
    expect(row.unitPrice).toBe(1.52);
  });

  it('reads the "ordinato dal" cutoff from DataDecorrenza', () => {
    expect(mapErpLatestOrderRows([liveRow]).fromDate).toBe('01/01/2024');
  });

  it('preserves the ERP row order, newest document first', () => {
    const { rows } = mapErpLatestOrderRows(twoRows);
    expect(rows.map((r) => r.document)).toEqual(['2026/1095', '2026/987']);
  });

  it('passes quantities through untouched even when they do not reconcile', () => {
    // 2148 ordered / 240 delivered / 0 residual is real ERP output. Deriving
    // any column from the others would contradict the ERP.
    const row = mapErpLatestOrderRows(twoRows).rows[1];
    expect(row.ordered).toBe(2148);
    expect(row.delivered).toBe(240);
    expect(row.residual).toBe(0);
  });

  it('returns an empty history when the customer never ordered the article', () => {
    // The endpoint answers ReturnCode 0 + [] for "never ordered" AND for every
    // bad-input case, so an empty list is the only signal there is.
    expect(mapErpLatestOrderRows([])).toEqual({ fromDate: '', rows: [] });
  });

  it('treats the MyMB null date 01/01/0001 as absent', () => {
    const { fromDate, rows } = mapErpLatestOrderRows([
      {
        ...liveRow,
        DataDecorrenza: '01/01/0001',
        DataRegistrazioneString: '01/01/0001',
      },
    ]);
    expect(fromDate).toBe('');
    expect(rows[0].date).toBe('');
  });

  it('survives a row with no PkRiga', () => {
    const [row] = mapErpLatestOrderRows([{ ...liveRow, PkRiga: null }]).rows;
    expect(row.document).toBe('');
    expect(row.causale).toBe('');
    expect(row.ordered).toBe(48);
  });

  it('defaults missing quantities to zero rather than NaN', () => {
    const [row] = mapErpLatestOrderRows([{ PkRiga: liveRow.PkRiga }]).rows;
    expect(row.ordered).toBe(0);
    expect(row.settled).toBe(0);
    expect(row.delivered).toBe(0);
    expect(row.residual).toBe(0);
    expect(row.unitPrice).toBe(0);
  });

  it('ignores a non-array payload', () => {
    expect(mapErpLatestOrderRows(undefined as any)).toEqual({
      fromDate: '',
      rows: [],
    });
  });
});
