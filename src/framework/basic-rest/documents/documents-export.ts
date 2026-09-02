import JsBarcode from 'jsbarcode';
import type {
  DocumentRow,
  DocumentLine,
} from '@framework/documents/types-b2b-documents';

/**
 * Per-document line exports for the documents page (Fatture / DDT).
 *
 * The Excel sheet mirrors the customer's own accounting export ("belli e
 * forti v2"): the invoice header repeated on every article line, then the
 * article, its barcode, quantities, amounts and the three line discounts.
 * The PDF stays the picking sheet — SKU · Prodotto · Q.tà×UM · Barcode, the
 * barcode drawn as a real Code-128 with the value beneath it.
 *
 * The barcode (EAN) is enriched per line from PIM by `entityCode` via
 * `fetchBarcodes` (see /api/b2b/barcodes); pass the resulting map in.
 */

/** Render a value as an inline Code-128 barcode SVG, with the value below it. */
function barcodeSvg(value: string): string {
  if (typeof document === 'undefined' || !value) return '';
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value, {
      format: 'CODE128',
      displayValue: true,
      fontSize: 13,
      height: 34,
      width: 1.4,
      margin: 4,
      textMargin: 1,
    });
    return svg.outerHTML;
  } catch {
    return '';
  }
}

export type BarcodeMap = Record<string, string>;

/**
 * Document-level values the lines themselves do not carry. `customerCode` is
 * the ERP customer the document belongs to (ERP_STATIC.customer_code).
 */
export type DocExportContext = { customerCode?: string };

/**
 * Minimal translate signature — pass the component's `t` to localize the
 * generated print/Excel HTML. Defaults to `IT_LABELS`, which returns each
 * label's Italian `defaultValue`, so callers without a `t` (or the default
 * theme) keep the original Italian output.
 */
export type PrintT = (key: string, opts?: { defaultValue?: string }) => string;
const IT_LABELS: PrintT = (_key, opts) => opts?.defaultValue ?? _key;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const qtyFmt = (n: number) =>
  new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(n || 0));

/**
 * Decimal in it-IT, without grouping separators — "1234,56". Grouping would
 * make the fallback text unparseable for Excel (see `numCell`).
 */
const decFmt = (n: number, maxDigits = 5) =>
  new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
    useGrouping: false,
  }).format(Number(n || 0));

/**
 * A numeric Excel cell. `x:num` carries the raw value, so Excel stores the
 * number regardless of the machine's locale; the it-IT text is only what a
 * reader (or an Excel that ignores x:num) sees.
 */
function numCell(value: number | undefined, maxDigits = 5): string {
  const n = Number(value || 0);
  return `<td x:num="${n}">${escapeHtml(decFmt(n, maxDigits))}</td>`;
}

/** The first three line discounts (%), zero-filled — the reference columns. */
function discountsOf(ln: DocumentLine): number[] {
  const d = ln.discounts ?? [];
  return [0, 1, 2].map((i) => Number(d[i] || 0));
}

/**
 * The unit price the discounts apply to: the ERP's own price when it sends
 * one, else the effective price derived from the line net.
 */
function unitPriceOf(ln: DocumentLine): number {
  return ln.listPrice ?? ln.unitPrice;
}

/** "10 PZ" — quantity with its unit of measure. */
function qtyUm(ln: DocumentLine): string {
  return `${qtyFmt(ln.quantity)} ${ln.uom}`.trim();
}

function barcodeOf(ln: DocumentLine, barcodes: BarcodeMap): string {
  return barcodes[ln.entityCode] ?? '';
}

/** Filesystem-safe slug, e.g. "V1/2026/3207" → "V1-2026-3207". */
function docSlug(document: string): string {
  return document.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
}

// ----------------------------------------------------------- barcode lookup --

/** Resolve EAN/barcode for a set of entity codes via the BFF route. */
export async function fetchBarcodes(
  entityCodes: string[],
): Promise<BarcodeMap> {
  const codes = [...new Set(entityCodes.filter(Boolean))];
  if (codes.length === 0) return {};
  try {
    const res = await fetch('/api/b2b/barcodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_codes: codes }),
    });
    if (!res.ok) return {};
    const json = await res.json();
    return (json?.barcodes as BarcodeMap) ?? {};
  } catch {
    return {};
  }
}

// ------------------------------------------------------------------- Excel ---

/**
 * Excel (.xls) export: an HTML table Excel opens natively.
 *
 * One row per article line, each carrying the document header (date, number,
 * ERP causale, customer) so the sheet can be filtered or concatenated with
 * other documents' exports.
 */
export function renderDocumentLinesExcelHtml(
  row: DocumentRow,
  barcodes: BarcodeMap,
  t: PrintT = IT_LABELS,
  ctx: DocExportContext = {},
): string {
  const lines = row.lines ?? [];
  const kind =
    row.doc_type === 'DDT'
      ? t('doc-print-ddt', { defaultValue: 'DDT' })
      : t('doc-print-invoice', { defaultValue: 'Fattura' });
  const title = `${kind} ${row.document}`;
  // mso-number-format:'\@' keeps codes as text (no scientific notation on a
  // 13-digit barcode, no leading zeros dropped from a customer code).
  const textCell = `style="mso-number-format:'\\@'"`;
  const txt = (v: unknown) => `<td ${textCell}>${escapeHtml(v)}</td>`;

  // The ERP causale ("VEN") when the row carries one — it is what the
  // customer's own export calls "Tipo Doc" — else the F/DDT tab value.
  const docType = row.scope || row.doc_type;
  const customerCode = ctx.customerCode ?? '';

  const body = lines
    .map((ln) => {
      const [sc1, sc2, sc3] = discountsOf(ln);
      return `
      <tr>
        ${txt(row.date_label)}
        ${txt(row.number)}
        ${txt(docType)}
        ${txt(ln.sku)}
        <td>${escapeHtml(ln.name)}</td>
        ${txt(barcodeOf(ln, barcodes))}
        <td>${escapeHtml(ln.uom)}</td>
        ${numCell(ln.quantity, 3)}
        ${numCell(unitPriceOf(ln))}
        ${numCell(ln.lineTotal, 2)}
        ${numCell(ln.vatRate, 2)}
        ${txt(customerCode)}
        ${numCell(sc1, 2)}
        ${numCell(sc2, 2)}
        ${numCell(sc3, 2)}
      </tr>`;
    })
    .join('');

  // The reference sheet is an invoice; a DDT export says so in the first two
  // headers rather than mislabelling its own date and number as an invoice's.
  const isDdt = row.doc_type === 'DDT';
  const headers = [
    isDdt
      ? ['doc-export-ddt-date', 'Data DDT']
      : ['doc-export-doc-date', 'Data Fatt'],
    isDdt
      ? ['doc-export-ddt-number', 'N. DDT']
      : ['doc-export-doc-number', 'N. Fatt'],
    ['doc-export-doc-type', 'Tipo Doc'],
    ['doc-export-item-code', 'Cod. Articolo'],
    ['doc-export-description', 'Descrizione'],
    ['doc-print-barcode', 'Barcode'],
    ['doc-export-uom', 'UM'],
    ['doc-export-qty', 'Q.ta'],
    ['doc-export-unit-price', 'Prezzo unitario'],
    ['doc-export-amount', 'Importo'],
    ['doc-export-vat', 'Iva'],
    ['doc-export-customer-code', 'Cod. Cliente'],
    ['doc-export-discount-1', 'Sconto 1'],
    ['doc-export-discount-2', 'Sconto 2'],
    ['doc-export-discount-3', 'Sconto 3'],
  ]
    .map(
      ([key, defaultValue]) =>
        `<th>${escapeHtml(t(key, { defaultValue }))}</th>`,
    )
    .join('\n        ');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8" /><title>${escapeHtml(title)}</title></head>
<body>
  <table border="1">
    <thead>
      <tr>
        ${headers}
      </tr>
    </thead>
    <tbody>
      ${body || `<tr><td colspan="15">${escapeHtml(t('doc-print-no-rows', { defaultValue: 'Nessuna riga' }))}</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;
}

export function downloadDocumentLinesExcel(
  row: DocumentRow,
  barcodes: BarcodeMap,
  t: PrintT = IT_LABELS,
  ctx: DocExportContext = {},
): void {
  if (typeof window === 'undefined') return;
  const html = renderDocumentLinesExcelHtml(row, barcodes, t, ctx);
  const blob = new Blob(['﻿' + html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${docSlug(row.document)}-distinta.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --------------------------------------------------------------------- PDF ---

export function renderDocumentLinesPdfHtml(
  row: DocumentRow,
  barcodes: BarcodeMap,
  t: PrintT = IT_LABELS,
): string {
  const lines = row.lines ?? [];
  const kind =
    row.doc_type === 'DDT'
      ? t('doc-print-ddt', { defaultValue: 'DDT' })
      : t('doc-print-invoice', { defaultValue: 'Fattura' });
  const title = `${kind} ${row.document}`;
  const exportDateLabel = new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const rowsHtml = lines
    .map((ln) => {
      const bc = barcodeOf(ln, barcodes);
      const svg = bc ? barcodeSvg(bc) : '';
      const barcodeCell = svg
        ? `<div class="bc">${svg}</div>`
        : bc
          ? escapeHtml(bc)
          : '—';
      return `
      <tr>
        <td><code>${escapeHtml(ln.sku)}</code></td>
        <td>${escapeHtml(ln.name)}</td>
        <td class="num">${escapeHtml(qtyUm(ln))}</td>
        <td class="barcode">${barcodeCell}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: only light; }
    * { box-sizing: border-box; }
    body { font-family: 'Inter', 'Segoe UI', Arial, Helvetica, sans-serif; margin: 32px; color: #0f172a; background: #f8fafc; }
    header { margin-bottom: 14px; }
    h1 { font-size: 22px; margin: 0; font-weight: 700; color: #1e293b; }
    .subtitle { margin-top: 4px; color: #475569; font-size: 12px; }
    .meta { margin-top: 4px; font-size: 12px; color: #64748b; }
    .actions { margin: 16px 0 24px; display: inline-flex; gap: 12px; }
    .actions button { padding: 9px 16px; border-radius: 6px; border: 1px solid #4338ca; background: linear-gradient(135deg, #4f46e5, #4338ca); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 18px rgba(79, 70, 229, 0.18); }
    .actions button.secondary { border-color: #cbd5f5; background: #fff; color: #1e293b; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08); }
    .actions button:hover { filter: brightness(0.95); }
    .section-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; background: #fff; }
    thead th { background: linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; color: #475569; padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    thead th.num { text-align: right; }
    th, td { padding: 8px 12px; vertical-align: top; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    td.barcode { width: 220px; }
    td.barcode .bc svg { display: block; max-width: 100%; height: auto; }
    code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.9em; color: #475569; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:nth-child(even) { background: #fcfcfd; }
    footer { margin-top: 28px; font-size: 11px; color: #94a3b8; text-align: center; padding-top: 14px; border-top: 1px solid #e2e8f0; }
    @media print { body { margin: 10mm; background: #fff; } .actions { display: none !important; } .section-card { box-shadow: none; border: 1px solid #d1d5db; } tbody tr:nth-child(even) { background: #fcfcfd !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <div class="subtitle">${escapeHtml(row.destination)}</div>
    <div class="meta">${escapeHtml(t('doc-print-date', { defaultValue: 'Data' }))}: ${escapeHtml(row.date_label)} &bull; ${lines.length} ${escapeHtml(t('doc-print-rows', { defaultValue: 'righe' }))} &bull; ${escapeHtml(t('doc-print-print-date', { defaultValue: 'Data stampa' }))}: ${escapeHtml(exportDateLabel)}</div>
  </header>

  <div class="actions">
    <button type="button" onclick="window.print();">${escapeHtml(t('doc-print-print', { defaultValue: 'Stampa' }))}</button>
    <button type="button" class="secondary" onclick="window.close()">${escapeHtml(t('doc-print-close', { defaultValue: 'Chiudi' }))}</button>
  </div>

  <div class="section-card">
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(t('doc-print-sku', { defaultValue: 'SKU' }))}</th>
          <th>${escapeHtml(t('doc-print-product', { defaultValue: 'Prodotto' }))}</th>
          <th class="num">${escapeHtml(t('doc-print-qty-um', { defaultValue: 'Q.tà x UM' }))}</th>
          <th>${escapeHtml(t('doc-print-barcode', { defaultValue: 'Barcode' }))}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="4" style="text-align:center;padding:24px;color:#94a3b8;">${escapeHtml(t('doc-print-no-rows', { defaultValue: 'Nessuna riga' }))}</td></tr>`}
      </tbody>
    </table>
  </div>

  <footer>${escapeHtml(t('doc-print-auto-generated', { defaultValue: 'Documento generato automaticamente' }))} &bull; ${escapeHtml(exportDateLabel)}</footer>
</body>
</html>`;
}

/** Open an HTML string in a print popup, revoking its blob URL on close. */
function openPrintWindow(html: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, '_blank');
  if (!popup) {
    URL.revokeObjectURL(url);
    alert('Abilita i popup per stampare il documento.');
    return;
  }

  let pollId: number | undefined;
  let fallbackTimer: number | undefined;
  let completed = false;
  const cleanup = () => {
    if (completed) return;
    completed = true;
    if (pollId != null) window.clearInterval(pollId);
    if (fallbackTimer != null) window.clearTimeout(fallbackTimer);
    URL.revokeObjectURL(url);
  };
  pollId = window.setInterval(() => {
    if (popup.closed) cleanup();
  }, 500);
  fallbackTimer = window.setTimeout(() => cleanup(), 5 * 60 * 1000);
}

export function openDocumentLinesPrintWindow(
  row: DocumentRow,
  barcodes: BarcodeMap,
  t: PrintT = IT_LABELS,
): void {
  openPrintWindow(renderDocumentLinesPdfHtml(row, barcodes, t));
}
