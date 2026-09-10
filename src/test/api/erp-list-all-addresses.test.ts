/**
 * Regression (baseprotection, time theme, 2026-09-10): the account orders and
 * documents LISTS query MyMB with an empty address_code on purpose — order
 * history spans ALL of a customer's ship-to addresses, and MyMB returns
 * nothing when filtered to a single CodiceIndirizzo. The 2.9.54 security
 * release put get_orders (and the document lists) in the address-scoped set,
 * which requires a non-empty owned address, so the list 403'd "Forbidden
 * address". Customer ownership is still enforced; only the mandatory-address
 * requirement is wrong for these list endpoints.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getOrders: vi.fn(async () => []),
  getInvoices: vi.fn(async () => []),
  getDdt: vi.fn(async () => []),
  getMultiplePrices: vi.fn(async () => ({})),
}));
const { sessionCustomerContext } = vi.hoisted(() => ({
  sessionCustomerContext: vi.fn(),
}));
vi.mock('@/lib/erp/factory', () => ({
  getMyMbErpClient: vi.fn(async () => client),
}));
vi.mock('@/lib/profile/session-owner', () => ({ sessionCustomerContext }));

import { POST } from '@/app/api/erp/[...path]/route';
import { NextRequest } from 'next/server';

function call(endpoint: string, body: unknown) {
  const req = new NextRequest(`http://localhost/api/erp/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ path: [endpoint] }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Session owns customer B_9990 with ship-to address A.
  sessionCustomerContext.mockResolvedValue({
    owned: new Map([['B_9990', new Set(['A'])]]),
    erpCodeById: new Map([['B_9990', 'B_9990']]),
    token: 'token',
  });
});

describe('ERP list endpoints span all owned addresses (empty address_code)', () => {
  it('get_orders with an empty address_code reaches MyMB (was 403)', async () => {
    const res = await call('get_orders', {
      customer_code: 'B_9990',
      address_code: '',
      type: 'T',
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('success');
    expect(client.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({ customerCode: 'B_9990', addressCode: '' }),
    );
  });

  it('get_invoices with an empty address_code reaches MyMB', async () => {
    const res = await call('get_invoices', {
      customer_code: 'B_9990',
      address_code: '',
    });
    expect(res.status).toBe(200);
    expect(client.getInvoices).toHaveBeenCalled();
  });

  it('get_ddt with an empty address_code reaches MyMB', async () => {
    const res = await call('get_ddt', {
      customer_code: 'B_9990',
      address_code: '',
    });
    expect(res.status).toBe(200);
    expect(client.getDdt).toHaveBeenCalled();
  });

  it('SECURITY: a non-empty address the session does NOT own is still 403', async () => {
    const res = await call('get_orders', {
      customer_code: 'B_9990',
      address_code: 'NOT-MINE',
      type: 'T',
    });
    expect(res.status).toBe(403);
    expect(client.getOrders).not.toHaveBeenCalled();
  });

  it('SECURITY: a customer the session does NOT own is still 403', async () => {
    const res = await call('get_orders', {
      customer_code: 'OTHER',
      address_code: '',
      type: 'T',
    });
    expect(res.status).toBe(403);
    expect(client.getOrders).not.toHaveBeenCalled();
  });

  it('narrowing to an OWNED address still works', async () => {
    const res = await call('get_orders', {
      customer_code: 'B_9990',
      address_code: 'A',
      type: 'T',
    });
    expect(res.status).toBe(200);
  });

  it('SECURITY: get_multiple_prices still REQUIRES a specific owned address', async () => {
    const res = await call('get_multiple_prices', {
      customer_code: 'B_9990',
      address_code: '',
      entity_codes: ['ART1'],
    });
    expect(res.status).toBe(403);
    expect(client.getMultiplePrices).not.toHaveBeenCalled();
  });
});
