import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@framework/utils/httpB2B', () => ({ post: vi.fn() }));

import {
  fetchDocumentsList,
  openDocument,
} from '@framework/documents/fetch-documents-list';
import { post } from '@framework/utils/httpB2B';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.clearAllMocks());

const base = {
  date_from: '01052026',
  date_to: '31052026',
  customer_code: '015892',
};

describe('fetchDocumentsList — default (VINC) branch', () => {
  it('DDT → /api/profile/delivery_note, maps to DDT rows with barcode url', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          available: true,
          items: [
            {
              _id: 'd1',
              data: {
                numero_ddt: '111',
                numero_documento: 'DDT/2026/111',
                data: '2026-05-10',
                destinazione: { label: 'SEDE' },
                pdf_url: 'https://cs/d.pdf',
                pdf_barcode_url: 'https://cs/bc.pdf',
              },
            },
          ],
        }),
      } as any;
    });
    const rows = await fetchDocumentsList(
      { ...base, type: 'DDT' } as any,
      'default',
    );
    expect(calls[0]).toContain('/api/profile/delivery_note');
    expect(calls[0]).toContain('relation_id=015892');
    expect(calls[0]).toContain('2026-05-01'); // date_from → ISO
    expect(rows).toHaveLength(1);
    expect(rows[0].doc_type).toBe('DDT');
    expect(rows[0].document).toBe('DDT/2026/111');
    expect(rows[0].pdf).toBe('/api/profile/document/delivery_note/d1?kind=pdf');
  });

  it('F → /api/profile/invoice, maps to F rows', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        available: true,
        items: [
          {
            _id: 'i1',
            data: {
              numero_fattura: '900',
              numero_documento: 'F/2026/900',
              data: '2026-05-10',
              csv_url: 'https://cs/x.csv',
            },
          },
        ],
      }),
    })) as any;
    const rows = await fetchDocumentsList(
      { ...base, type: 'F' } as any,
      'default',
    );
    expect(rows[0].doc_type).toBe('F');
    expect(rows[0].csv).toBe('/api/profile/document/invoice/i1?kind=csv');
  });

  it('returns [] when the model is unavailable', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ available: false, items: [] }),
    })) as any;
    const rows = await fetchDocumentsList(
      { ...base, type: 'F' } as any,
      'default',
    );
    expect(rows).toEqual([]);
  });
});

describe('openDocument — VINC direct urls', () => {
  it('opens the row direct url and does NOT call the ERP wrapper', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null as any);
    await openDocument('csv', {
      doc_type: 'F',
      csv: 'https://cs/x.csv',
    } as any);
    expect(openSpy).toHaveBeenCalledWith(
      'https://cs/x.csv',
      '_blank',
      'noopener,noreferrer',
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('opens a DDT barcode direct url without the ERP wrapper', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null as any);
    await openDocument('barcode', {
      doc_type: 'DDT',
      barcodePdf: 'https://cs/bc.pdf',
    } as any);
    expect(openSpy).toHaveBeenCalledWith(
      'https://cs/bc.pdf',
      '_blank',
      'noopener,noreferrer',
    );
    expect(post).not.toHaveBeenCalled();
  });
});

describe('openDocument — PDF fetch-then-open (no JSON error tab)', () => {
  const invoiceRow = {
    doc_type: 'F',
    pdf: '/api/erp/invoice-pdf?customer_code=5300&year=2026&number=670',
  } as any;

  beforeEach(() => {
    (URL as any).createObjectURL = vi.fn(() => 'blob:pdf');
    (URL as any).revokeObjectURL = vi.fn();
  });

  it('throws the backend message when the PDF is not available, and never navigates the tab to JSON', async () => {
    const win = { close: vi.fn(), location: { href: '' } };
    vi.spyOn(window, 'open').mockReturnValue(win as any);
    global.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({
        status: 'error',
        code: 'document_not_available',
        message: 'Documento non ancora disponibile in archivio.',
      }),
    })) as any;

    await expect(openDocument('pdf', invoiceRow)).rejects.toThrow(
      'Documento non ancora disponibile in archivio.',
    );
    expect(win.close).toHaveBeenCalled(); // reserved tab closed
    expect(win.location.href).toBe(''); // never pointed at the JSON URL
  });

  it('opens the fetched PDF blob on success', async () => {
    const win = { close: vi.fn(), location: { href: '' } };
    vi.spyOn(window, 'open').mockReturnValue(win as any);
    global.fetch = vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    })) as any;

    await openDocument('pdf', invoiceRow);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(win.location.href).toBe('blob:pdf');
    expect(win.close).not.toHaveBeenCalled();
  });
});
