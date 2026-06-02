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

const base = { date_from: '01052026', date_to: '31052026', customer_code: '015892' };

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
                pdf_barcode_url: 'https://cs/bc.pdf',
              },
            },
          ],
        }),
      } as any;
    });
    const rows = await fetchDocumentsList({ ...base, type: 'DDT' } as any, 'default');
    expect(calls[0]).toContain('/api/profile/delivery_note');
    expect(calls[0]).toContain('relation_id=015892');
    expect(calls[0]).toContain('2026-05-01'); // date_from → ISO
    expect(rows).toHaveLength(1);
    expect(rows[0].doc_type).toBe('DDT');
    expect(rows[0].document).toBe('DDT/2026/111');
    expect(rows[0].barcodePdf).toBe('https://cs/bc.pdf');
  });

  it('F → /api/profile/invoice, maps to F rows', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        available: true,
        items: [
          { _id: 'i1', data: { numero_fattura: '900', numero_documento: 'F/2026/900', data: '2026-05-10', csv_url: 'https://cs/x.csv' } },
        ],
      }),
    })) as any;
    const rows = await fetchDocumentsList({ ...base, type: 'F' } as any, 'default');
    expect(rows[0].doc_type).toBe('F');
    expect(rows[0].csv).toBe('https://cs/x.csv');
  });

  it('returns [] when the model is unavailable', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ available: false, items: [] }),
    })) as any;
    const rows = await fetchDocumentsList({ ...base, type: 'F' } as any, 'default');
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
});
