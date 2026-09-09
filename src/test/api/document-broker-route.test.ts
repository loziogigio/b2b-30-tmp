import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { resolveStorefrontSession, fetchModelRecord } = vi.hoisted(() => ({
  resolveStorefrontSession: vi.fn(),
  fetchModelRecord: vi.fn(),
}));

vi.mock('@/lib/auth/storefront-session', () => ({ resolveStorefrontSession }));
vi.mock('@/lib/profile/cs-creds', () => ({
  resolveCsCreds: vi.fn(async () => ({
    csBaseUrl: 'https://cs',
    apiKeyId: 'k',
    apiSecret: 's',
  })),
}));
vi.mock('@/lib/profile/vinc-data-models', async (orig) => {
  const actual = await (orig as any)();
  return { ...actual, fetchModelRecord };
});

import { GET } from '@/app/api/profile/document/[model]/[id]/route';
import { NextRequest } from 'next/server';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => {
  resolveStorefrontSession.mockReset();
  fetchModelRecord.mockReset();
});

function req(model: string, id: string, kind = 'pdf') {
  return new NextRequest(
    `http://localhost/api/profile/document/${model}/${id}?kind=${kind}`,
  );
}
const ctx = (model: string, id: string) => ({
  params: Promise.resolve({ model, id }),
});

describe('GET /api/profile/document/[model]/[id]', () => {
  it('404s an unknown model (before any session/record work)', async () => {
    const res = await GET(req('erp_settings', 'x'), ctx('erp_settings', 'x'));
    expect(res.status).toBe(404);
    expect(resolveStorefrontSession).not.toHaveBeenCalled();
  });

  it('401s when there is no valid session', async () => {
    resolveStorefrontSession.mockResolvedValue(null);
    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(401);
  });

  it('403s when the record is owned by another customer', async () => {
    resolveStorefrontSession.mockResolvedValue({
      token: 'token',
      tenantId: 'tenant-a',
      user: {
        id: 'user-a',
        customers: [
          {
            id: 'customer-a',
            erp_customer_id: '015892',
            addresses: [{ erp_address_id: 'ADDRESS-A' }],
          },
        ],
      },
    });
    fetchModelRecord.mockResolvedValue({
      _id: 'i1',
      relation_id: '999999',
      data: {
        destinazione: { code: 'ADDRESS-A' },
        pdf_url: 'https://files.example.test/documenti-clienti/x.pdf',
      },
    });
    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(403);
  });

  it('404s when the owned record has no file for the kind', async () => {
    resolveStorefrontSession.mockResolvedValue({
      token: 'token',
      tenantId: 'tenant-a',
      user: {
        id: 'user-a',
        customers: [
          {
            id: 'customer-a',
            erp_customer_id: '015892',
            addresses: [{ erp_address_id: 'ADDRESS-A' }],
          },
        ],
      },
    });
    fetchModelRecord.mockResolvedValue({
      _id: 'i1',
      relation_id: '015892',
      data: { destinazione: { code: 'ADDRESS-A' } },
    });
    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(404);
  });

  it('streams the file (via the internal overlay) when the session owns the record', async () => {
    delete process.env.DOCUMENTI_CLIENTI_BASE; // rely on the in-code default overlay base
    resolveStorefrontSession.mockResolvedValue({
      token: 'token',
      tenantId: 'tenant-a',
      user: {
        id: 'user-a',
        customers: [
          {
            id: 'customer-a',
            erp_customer_id: '015892',
            addresses: [{ erp_address_id: 'ADDRESS-A' }],
          },
        ],
      },
    });
    fetchModelRecord.mockResolvedValue({
      _id: 'i1',
      relation_id: '015892',
      data: {
        destinazione: { code: 'ADDRESS-A' },
        pdf_url:
          'https://files.example.test/documenti-clienti/D.D.T/2026/F.pdf',
      },
    });
    let fetchedUrl = '';
    global.fetch = vi.fn(async (u: any) => {
      fetchedUrl = String(u);
      return {
        ok: true,
        status: 200,
        body: new ReadableStream(),
        headers: new Headers({
          'content-type': 'application/pdf',
          'content-length': '123',
        }),
      } as any;
    }) as any;

    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-length')).toBe('123');
    expect(res.headers.get('cache-control')).toContain('private');
    // overlay rewrite: strip /documenti-clienti, prepend the base
    expect(fetchedUrl).toBe('http://vinc-tunnelgw:28000/D.D.T/2026/F.pdf');
    delete process.env.DOCUMENTI_CLIENTI_BASE;
  });

  it('propagates a 404 from the upstream file server', async () => {
    resolveStorefrontSession.mockResolvedValue({
      token: 'token',
      tenantId: 'tenant-a',
      user: {
        id: 'user-a',
        customers: [
          {
            id: 'customer-a',
            erp_customer_id: '015892',
            addresses: [{ erp_address_id: 'ADDRESS-A' }],
          },
        ],
      },
    });
    fetchModelRecord.mockResolvedValue({
      _id: 'i1',
      relation_id: '015892',
      data: {
        destinazione: { code: 'ADDRESS-A' },
        pdf_url: 'https://files.example.test/documenti-clienti/x.pdf',
      },
    });
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      body: null,
    })) as any;
    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(404);
  });

  it('502s on other upstream failures', async () => {
    resolveStorefrontSession.mockResolvedValue({
      token: 'token',
      tenantId: 'tenant-a',
      user: {
        id: 'user-a',
        customers: [
          {
            id: 'customer-a',
            erp_customer_id: '015892',
            addresses: [{ erp_address_id: 'ADDRESS-A' }],
          },
        ],
      },
    });
    fetchModelRecord.mockResolvedValue({
      _id: 'i1',
      relation_id: '015892',
      data: {
        destinazione: { code: 'ADDRESS-A' },
        pdf_url: 'https://files.example.test/documenti-clienti/x.pdf',
      },
    });
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      body: null,
    })) as any;
    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(502);
  });

  it('refuses to proxy a non documenti-clienti URL (never fetches it)', async () => {
    resolveStorefrontSession.mockResolvedValue({
      token: 'token',
      tenantId: 'tenant-a',
      user: {
        id: 'user-a',
        customers: [
          {
            id: 'customer-a',
            erp_customer_id: '015892',
            addresses: [{ erp_address_id: 'ADDRESS-A' }],
          },
        ],
      },
    });
    fetchModelRecord.mockResolvedValue({
      _id: 'i1',
      relation_id: '015892',
      data: {
        destinazione: { code: 'ADDRESS-A' },
        pdf_url: 'https://evil.example/secret',
      },
    });
    const f = vi.fn();
    global.fetch = f as any;
    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(404);
    expect(f).not.toHaveBeenCalled();
  });
});
