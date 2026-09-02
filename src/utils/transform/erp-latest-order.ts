/**
 * MyMB `GetUltimoOrdinatoClienteXArticolo` → the rows the "già ordinato"
 * popup renders: this customer's order history for one article.
 *
 * Live row captured from a tenant MyMB instance (customer 5300 ×
 * article 53295, 2026-09-02):
 *
 * ```jsonc
 * {
 *   "DataDecorrenza": "01/01/2024",             // ERP-wide history cutoff
 *   "DataRegistrazioneString": "31/07/2026",    // DD/MM/YYYY, already formatted
 *   "DataRegistrazione": "/Date(1785448800000+0200)/",  // .NET epoch, unused
 *   "PkRiga": { "CausaleDocumento": "OC", "AnnoDocumento": 2026,
 *               "NumeroDocumento": 1110, "NumeroRiga": 160 },
 *   "QuantitaOrdinata": 48, "QuantitaSaldata": 0,
 *   "QuantitaConsegnata": 48, "QuantitaResidua": 0,
 *   "PrezzaturaImputata_Prezzo": 1.52,
 *   "UM": null, "CodicePadreVarianti": "", "art_CodiceInterno": "53295"
 * }
 * ```
 *
 * Two things this mapper deliberately does not do:
 *
 * - **It never computes one quantity from the others.** A live row reads
 *   ordered 2148 / delivered 240 / residual 0. The four columns are
 *   independent ERP figures; deriving any of them contradicts the ERP.
 * - **It exposes no unit of measure.** `UM` came back `null` on all 113 live
 *   rows sampled on a production instance, including articles PIM lists with a unit, so the UOM has to
 *   come from the price data (`packaging_option_default.packaging_uom`).
 */

/** MyMB's null date. Year 1 means "absent", not a real date (see runbook §9). */
const MYMB_NULL_DATE = '01/01/0001';

export type LatestOrderRow = {
  /** `DD/MM/YYYY`, or '' when the ERP sent its null date. */
  date: string;
  /** Document cause — `OC`, `VEN`, `BC`… */
  causale: string;
  /** `Anno/Numero`, e.g. `2026/1110`. '' when the row carries no PkRiga. */
  document: string;
  lineNumber: number;
  ordered: number;
  settled: number;
  delivered: number;
  residual: number;
  /** `PrezzaturaImputata_Prezzo` — the imputed unit price on that line. */
  unitPrice: number;
};

export type LatestOrderHistory = {
  /** `DataDecorrenza` — the "ORDINATO DAL …" cutoff. '' when absent. */
  fromDate: string;
  rows: LatestOrderRow[];
};

const EMPTY_HISTORY: LatestOrderHistory = { fromDate: '', rows: [] };

function date(value: unknown): string {
  const raw = String(value ?? '').trim();
  return raw && raw !== MYMB_NULL_DATE ? raw : '';
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapErpLatestOrderRows(raw: unknown): LatestOrderHistory {
  if (!Array.isArray(raw) || raw.length === 0) return { ...EMPTY_HISTORY };

  const rows = raw.map((row: any): LatestOrderRow => {
    const pk = row?.PkRiga ?? {};
    const year = pk.AnnoDocumento;
    const number = pk.NumeroDocumento;
    return {
      date: date(row?.DataRegistrazioneString),
      causale: String(pk.CausaleDocumento ?? ''),
      document: year != null && number != null ? `${year}/${number}` : '',
      lineNumber: num(pk.NumeroRiga),
      ordered: num(row?.QuantitaOrdinata),
      settled: num(row?.QuantitaSaldata),
      delivered: num(row?.QuantitaConsegnata),
      residual: num(row?.QuantitaResidua),
      unitPrice: num(row?.PrezzaturaImputata_Prezzo),
    };
  });

  // The cutoff is an ERP-wide constant repeated on every row; take the first
  // one that carries it.
  const fromDate = raw.map((r: any) => date(r?.DataDecorrenza)).find(Boolean);

  return { fromDate: fromDate ?? '', rows };
}
