import { describe, it, expect } from 'vitest';
import { renderDocumentLinesExcelHtml } from '@framework/documents/documents-export';
import type {
  DocumentRow,
  DocumentLine,
} from '@framework/documents/types-b2b-documents';

// Invoice VEN/2026/2555 for Sais S.r.l. (customer 5300) on the Belli e Forti
// ERP — the document the reference export ("esempio belli e forti v2") was
// taken from, so these numbers are the ones the customer expects to see.
const line: DocumentLine = {
  lineNumber: 40,
  sku: 'BF00821',
  entityCode: '52290',
  name: 'BACINELLA - QUAD. - 14 LT - GRIGIO',
  quantity: 72,
  uom: 'Nr',
  unitPrice: 1.04,
  listPrice: 1.04,
  vatRate: 22,
  lineTotal: 74.88,
  discounts: [0, 0, 0, 0, 0, 0],
};

const row: DocumentRow = {
  destination: 'Via Casilina n. 1890/I',
  dateISO: '2026-06-30',
  date_label: '30/06/2026',
  document: 'VEN/2026/2555',
  doc_type: 'F',
  number: '2555',
  scope: 'VEN',
  year: 2026,
  number_raw: 2555,
  type_bar_code: 'I',
  lines: [line],
};

const barcodes = { '52290': '8001499008210' };

/** Header labels in document order, stripped of markup. */
function headers(html: string): string[] {
  const thead = html.slice(html.indexOf('<thead'), html.indexOf('</thead>'));
  return [...thead.matchAll(/<th[^>]*>(.*?)<\/th>/g)].map((m) =>
    m[1].replace(/&amp;/g, '&').trim(),
  );
}

/** Body cells of the first data row, stripped of markup. */
function firstBodyRow(html: string): string[] {
  const tbody = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'));
  const tr = tbody.slice(tbody.indexOf('<tr>'), tbody.indexOf('</tr>'));
  return [...tr.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((m) => m[1].trim());
}

describe('renderDocumentLinesExcelHtml', () => {
  it('emits the 15 reference columns in order', () => {
    const html = renderDocumentLinesExcelHtml(row, barcodes);
    expect(headers(html)).toEqual([
      'Data Fatt',
      'N. Fatt',
      'Tipo Doc',
      'Cod. Articolo',
      'Descrizione',
      'Barcode',
      'UM',
      'Q.ta',
      'Prezzo unitario',
      'Importo',
      'Iva',
      'Cod. Cliente',
      'Sconto 1',
      'Sconto 2',
      'Sconto 3',
    ]);
  });

  it('repeats the document header fields on every article line', () => {
    const html = renderDocumentLinesExcelHtml(row, barcodes, undefined, {
      customerCode: '5300',
    });
    const cells = firstBodyRow(html);
    expect(cells[0]).toBe('30/06/2026'); // Data Fatt
    expect(cells[1]).toBe('2555'); // N. Fatt
    expect(cells[2]).toBe('VEN'); // Tipo Doc — ERP causale, not F/DDT
    expect(cells[11]).toBe('5300'); // Cod. Cliente
  });

  it('carries the article, barcode and amounts of the line', () => {
    const html = renderDocumentLinesExcelHtml(row, barcodes, undefined, {
      customerCode: '5300',
    });
    const cells = firstBodyRow(html);
    expect(cells[3]).toBe('BF00821');
    expect(cells[4]).toBe('BACINELLA - QUAD. - 14 LT - GRIGIO');
    expect(cells[5]).toBe('8001499008210');
    expect(cells[6]).toBe('Nr');
    expect(cells[7]).toBe('72');
    expect(cells[8]).toBe('1,04');
    expect(cells[9]).toBe('74,88');
    expect(cells[10]).toBe('22');
    expect(cells.slice(12)).toEqual(['0', '0', '0']);
  });

  it('gives Excel the raw numeric value, locale-independently', () => {
    const html = renderDocumentLinesExcelHtml(
      { ...row, lines: [{ ...line, listPrice: 1.007, quantity: 420 }] },
      barcodes,
    );
    // x:num wins over the it-IT cell text, so an en-US Excel cannot read
    // "1,007" as one thousand and seven.
    expect(html).toContain('x:num="1.007"');
    expect(html).toContain('x:num="420"');
  });

  it('prefers the ERP list price the discounts apply to', () => {
    const discounted = {
      ...line,
      listPrice: 2.49156,
      unitPrice: 1.121,
      lineTotal: 11.21,
      quantity: 10,
      discounts: [55, 0, 0, 0, 0, 0],
    };
    const cells = firstBodyRow(
      renderDocumentLinesExcelHtml({ ...row, lines: [discounted] }, barcodes),
    );
    expect(cells[8]).toBe('2,49156'); // Prezzo unitario = pre-discount
    expect(cells[9]).toBe('11,21'); // Importo = net, discounts applied
    expect(cells.slice(12)).toEqual(['55', '0', '0']);
  });

  it('falls back to the derived unit price when the ERP sends no list price', () => {
    const cells = firstBodyRow(
      renderDocumentLinesExcelHtml(
        { ...row, lines: [{ ...line, listPrice: undefined }] },
        barcodes,
      ),
    );
    expect(cells[8]).toBe('1,04');
  });

  it('renders an empty barcode and no discounts as empty/zero, not undefined', () => {
    const cells = firstBodyRow(
      renderDocumentLinesExcelHtml(
        { ...row, lines: [{ ...line, discounts: undefined }] },
        {},
      ),
    );
    expect(cells[5]).toBe('');
    expect(cells.slice(12)).toEqual(['0', '0', '0']);
  });

  it('spans the placeholder across every column when there are no lines', () => {
    const html = renderDocumentLinesExcelHtml({ ...row, lines: [] }, barcodes);
    expect(html).toContain('colspan="15"');
  });
});

describe('renderDocumentLinesExcelHtml on a DDT', () => {
  it('labels the document columns as a delivery note, not an invoice', () => {
    const html = renderDocumentLinesExcelHtml(
      { ...row, doc_type: 'DDT', scope: 'BC', number: '3148' },
      barcodes,
    );
    const thead = html.slice(html.indexOf('<thead'), html.indexOf('</thead>'));
    expect(thead).toContain('Data DDT');
    expect(thead).toContain('N. DDT');
    expect(thead).not.toContain('Fatt');
  });
});
