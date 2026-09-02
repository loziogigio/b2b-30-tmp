import { beforeEach, describe, it, expect, vi } from 'vitest';

const { getLatestOrderByItem, sessionOwnedCustomerCodes } = vi.hoisted(() => ({
  getLatestOrderByItem: vi.fn(),
  sessionOwnedCustomerCodes: vi.fn(),
}));
vi.mock('@/lib/erp/factory', () => ({
  getMyMbErpClient: vi.fn(async () => ({ getLatestOrderByItem })),
}));
vi.mock('@/lib/profile/session-owner', () => ({ sessionOwnedCustomerCodes }));

import { POST } from '@/app/api/erp/[...path]/route';
import { NextRequest } from 'next/server';

const PATH = 'get_latest_order_by_item';

// The live row for customer 5300 × article 53295 (SKU BF05003).
const liveRow = {
  DataDecorrenza: '01/01/2024',
  DataRegistrazioneString: '31/07/2026',
  PkRiga: {
    AnnoDocumento: 2026,
    CausaleDocumento: 'OC',
    NumeroDocumento: 1110,
    NumeroRiga: 160,
  },
  QuantitaOrdinata: 48,
  QuantitaSaldata: 0,
  QuantitaConsegnata: 48,
  QuantitaResidua: 0,
  PrezzaturaImputata_Prezzo: 1.52,
  UM: null,
};

function req(body: unknown) {
  return new NextRequest(`http://localhost/api/erp/${PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function call(body: unknown) {
  return POST(req(body), { params: Promise.resolve({ path: [PATH] }) });
}

describe('POST /api/erp/get_latest_order_by_item', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionOwnedCustomerCodes.mockResolvedValue(new Set(['5300']));
  });

  it('returns the article history mapped for the popup', async () => {
    getLatestOrderByItem.mockResolvedValue([liveRow]);

    const res = await call({ customer_code: '5300', entity_code: '53295' });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('success');
    expect(json.data.fromDate).toBe('01/01/2024');
    expect(json.data.rows).toHaveLength(1);
    expect(json.data.rows[0]).toMatchObject({
      date: '31/07/2026',
      causale: 'OC',
      document: '2026/1110',
      ordered: 48,
      delivered: 48,
    });
  });

  it('passes the ERP customer and entity codes straight through', async () => {
    getLatestOrderByItem.mockResolvedValue([]);

    await call({ customer_code: '5300', entity_code: '53295' });

    expect(getLatestOrderByItem).toHaveBeenCalledWith({
      customerCode: '5300',
      entityCode: '53295',
    });
  });

  it('reports an empty history as success, not as an error', async () => {
    // MyMB answers ReturnCode 0 + [] for "never ordered" and for every
    // bad-input case alike, so an empty list must not become a 4xx/5xx.
    getLatestOrderByItem.mockResolvedValue([]);

    const res = await call({ customer_code: '5300', entity_code: '99999' });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('success');
    expect(json.data).toEqual({ fromDate: '', rows: [] });
  });

  it('rejects anonymous requests before reaching the ERP', async () => {
    sessionOwnedCustomerCodes.mockResolvedValue(null);

    const res = await call({ customer_code: '5300', entity_code: '53295' });

    expect(res.status).toBe(401);
    expect(getLatestOrderByItem).not.toHaveBeenCalled();
  });

  it("refuses to read another customer's order history", async () => {
    const res = await call({ customer_code: '5301', entity_code: '53295' });

    expect(res.status).toBe(403);
    expect(getLatestOrderByItem).not.toHaveBeenCalled();
  });

  it('returns 502 when the ERP call throws', async () => {
    getLatestOrderByItem.mockRejectedValue(new Error('erp down'));

    const res = await call({ customer_code: '5300', entity_code: '53295' });

    expect(res.status).toBe(502);
  });
});
