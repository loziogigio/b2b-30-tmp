import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/profile/cs-creds', () => ({
  resolveCsCreds: vi.fn(async () => ({
    csBaseUrl: 'https://cs.example',
    apiKeyId: 'k',
    apiSecret: 's',
  })),
}));

import { POST } from '@/app/api/b2b/customer/route';
import { NextRequest } from 'next/server';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.restoreAllMocks());

function req(body: unknown) {
  return new NextRequest('http://localhost/api/b2b/customer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/b2b/customer', () => {
  it('400s when customer_id is missing', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it('fetches the CS customer and returns a mapped CustomerProfile', async () => {
    let calledUrl = '';
    let headers: any;
    global.fetch = vi.fn(async (url: any, init: any) => {
      calledUrl = String(url);
      headers = init?.headers;
      return {
        ok: true,
        json: async () => ({
          success: true,
          customer: {
            public_code: '007959',
            company_name: 'ACME',
            customer_type: 'business',
            legal_info: { vat_number: 'IT1', pec_email: 'p@e.it', sdi_code: 'SDI123' },
          },
        }),
      } as any;
    }) as any;

    const res = await POST(req({ customer_id: 'cust_X' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(calledUrl).toBe('https://cs.example/api/b2b/customers/cust_X');
    expect(headers['x-api-key-id']).toBe('k');
    expect(json.success).toBe(true);
    expect(json.customer.code).toBe('007959');
    expect(json.customer.vatNumber).toBe('IT1');
    expect(json.customer.sdi).toBe('SDI123');
  });

  it('502s when the upstream call fails', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500 })) as any;
    const res = await POST(req({ customer_id: 'cust_X' }));
    expect(res.status).toBe(502);
  });
});
