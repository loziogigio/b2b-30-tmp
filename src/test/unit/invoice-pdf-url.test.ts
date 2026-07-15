import { describe, it, expect } from 'vitest';
import { buildInvoicePdfUrl } from '@utils/transform/b2b-documents-list';
import type { DocumentRow } from '@framework/documents/types-b2b-documents';

const row = (over: Partial<DocumentRow> = {}): DocumentRow =>
  ({
    doc_type: 'F',
    scope: 'VEN',
    year: 2026,
    number_raw: 670,
    type: 1,
    ...over,
  }) as DocumentRow;

describe('buildInvoicePdfUrl', () => {
  it('builds the gated /api/erp/invoice-pdf URL from the row identifiers', () => {
    const u = new URL(
      'http://x' +
        buildInvoicePdfUrl({
          customerCode: 'B_1',
          addressCode: '2',
          row: row(),
        }),
    );
    expect(u.pathname).toBe('/api/erp/invoice-pdf');
    expect(u.searchParams.get('customer_code')).toBe('B_1');
    expect(u.searchParams.get('address_code')).toBe('2');
    expect(u.searchParams.get('year')).toBe('2026');
    expect(u.searchParams.get('number')).toBe('670');
    expect(u.searchParams.get('cause')).toBe('VEN');
  });

  it('omits address_code when absent', () => {
    const u = new URL(
      'http://x' + buildInvoicePdfUrl({ customerCode: 'B_1', row: row() }),
    );
    expect(u.searchParams.has('address_code')).toBe(false);
  });
});
