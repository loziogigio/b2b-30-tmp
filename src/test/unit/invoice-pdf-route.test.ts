import { describe, it, expect, vi, beforeEach } from 'vitest';

const owned = vi.fn();
const erpClient = { getInvoices: vi.fn() };
const arxivarCfg = vi.fn();
const getInvoicePdf = vi.fn();

vi.mock('@/lib/profile/session-owner', () => ({
  sessionOwnedCustomerCodes: (...a: any[]) => owned(...a),
}));
vi.mock('@/lib/erp/factory', () => ({
  getMyMbErpClient: async () => erpClient,
}));
vi.mock('@/lib/erp/arxivar-config', () => ({
  resolveArxivarConfig: (...a: any[]) => arxivarCfg(...a),
}));
vi.mock('@utils/date-to-erp', () => ({ toErpNumericDate: () => '01011970' }));
vi.mock('vinc-erp', () => ({
  ArxivarClient: class {
    getInvoicePdf = (...a: any[]) => getInvoicePdf(...a);
  },
}));

import { GET } from '@/app/api/erp/invoice-pdf/route';

function req(qs: string) {
  return new Request(`http://localhost/api/erp/invoice-pdf?${qs}`) as any;
}

beforeEach(() => {
  owned.mockReset();
  erpClient.getInvoices.mockReset();
  arxivarCfg.mockReset();
  getInvoicePdf.mockReset();
  arxivarCfg.mockResolvedValue({
    enabled: true,
    baseUrl: 'http://h:8883/x',
    authHeader: 'Basic z',
  });
});

describe('GET /api/erp/invoice-pdf', () => {
  it('401 when the session owns no customer', async () => {
    owned.mockResolvedValue(new Set());
    const res = await GET(req('customer_code=B_1&year=2026&number=670'));
    expect(res.status).toBe(401);
  });

  it('403 when customer_code is not session-owned', async () => {
    owned.mockResolvedValue(new Set(['999']));
    const res = await GET(req('customer_code=B_1&year=2026&number=670'));
    expect(res.status).toBe(403);
    expect(getInvoicePdf).not.toHaveBeenCalled();
  });

  it('403 when the (year, number) is not in the customer invoice list', async () => {
    owned.mockResolvedValue(new Set(['B_1']));
    erpClient.getInvoices.mockResolvedValue([{ year: 2026, number: 999 }]);
    const res = await GET(req('customer_code=B_1&year=2026&number=670'));
    expect(res.status).toBe(403);
    expect(getInvoicePdf).not.toHaveBeenCalled();
  });

  it('streams application/pdf for an owned invoice', async () => {
    owned.mockResolvedValue(new Set(['B_1']));
    erpClient.getInvoices.mockResolvedValue([
      { year: 2026, number: 670, scope: 'VEN', type: 1 },
    ]);
    getInvoicePdf.mockResolvedValue(
      Buffer.from('%PDF-1.4 test').toString('base64'),
    );
    const res = await GET(
      req('customer_code=B_1&year=2026&number=670&docType=1'),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('inline');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.toString('utf8')).toBe('%PDF-1.4 test');
  });

  it('404 document_not_available when the archive has no PDF for the invoice', async () => {
    owned.mockResolvedValue(new Set(['B_1']));
    erpClient.getInvoices.mockResolvedValue([
      { year: 2026, number: 670, scope: 'VEN', type: 1 },
    ]);
    getInvoicePdf.mockResolvedValue(null); // 200 from ArxivarIX, empty Data
    const res = await GET(req('customer_code=B_1&year=2026&number=670'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('document_not_available');
    expect(body.status).toBe('error');
    expect(typeof body.message).toBe('string');
  });

  it('502 archive_unreachable when the archive request throws (service down)', async () => {
    owned.mockResolvedValue(new Set(['B_1']));
    erpClient.getInvoices.mockResolvedValue([
      { year: 2026, number: 670, scope: 'VEN', type: 1 },
    ]);
    getInvoicePdf.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await GET(req('customer_code=B_1&year=2026&number=670'));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe('archive_unreachable');
  });

  it('503 archive_not_configured when no ArxivarIX connection is set', async () => {
    owned.mockResolvedValue(new Set(['B_1']));
    erpClient.getInvoices.mockResolvedValue([
      { year: 2026, number: 670, scope: 'VEN', type: 1 },
    ]);
    arxivarCfg.mockResolvedValue({ enabled: false, baseUrl: '', authHeader: '' });
    const res = await GET(req('customer_code=B_1&year=2026&number=670'));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('archive_not_configured');
    expect(getInvoicePdf).not.toHaveBeenCalled();
  });

  it('binds cause/docType to the verified invoice row, ignoring client-supplied query params (IDOR fix)', async () => {
    owned.mockResolvedValue(new Set(['B_1']));
    // The matched row's real causale is 'VEN', but the client tries to smuggle
    // a different causale/docType via the query string to reach another document.
    erpClient.getInvoices.mockResolvedValue([
      { year: 2026, number: 670, scope: 'VEN', type: 1 },
    ]);
    getInvoicePdf.mockResolvedValue(
      Buffer.from('%PDF-1.4 test').toString('base64'),
    );
    const res = await GET(
      req('customer_code=B_1&year=2026&number=670&cause=NC&docType=9'),
    );
    expect(res.status).toBe(200);
    expect(getInvoicePdf).toHaveBeenCalledTimes(1);
    const call = getInvoicePdf.mock.calls[0][0];
    expect(call.cause).toBe('VEN');
    expect(call.cause).not.toBe('NC');
    expect(call.docType).toBe(1);
    expect(call.year).toBe('2026');
    expect(call.number).toBe('670');
  });
});
