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
    owned.mockResolvedValue(new Set(['1']));
    erpClient.getInvoices.mockResolvedValue([{ year: 2026, number: 999 }]);
    const res = await GET(req('customer_code=B_1&year=2026&number=670'));
    expect(res.status).toBe(403);
    expect(getInvoicePdf).not.toHaveBeenCalled();
  });

  it('streams application/pdf for an owned invoice', async () => {
    owned.mockResolvedValue(new Set(['1']));
    erpClient.getInvoices.mockResolvedValue([{ year: 2026, number: 670 }]);
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

  it('404 when ArxivarIX has no document', async () => {
    owned.mockResolvedValue(new Set(['1']));
    erpClient.getInvoices.mockResolvedValue([{ year: 2026, number: 670 }]);
    getInvoicePdf.mockRejectedValue(new Error('no content'));
    const res = await GET(req('customer_code=B_1&year=2026&number=670'));
    expect(res.status).toBe(404);
  });
});
