import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  resolveTenantApiConfig: vi.fn(),
  resolveAuthContext: vi.fn(),
  validateToken: vi.fn(),
}));

vi.mock('@/lib/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant')>();
  return {
    ...actual,
    resolveTenantApiConfig: mocks.resolveTenantApiConfig,
  };
});

vi.mock('@/lib/auth/server', () => ({
  AUTH_COOKIES: { ACCESS_TOKEN: 'auth_token' },
  resolveAuthContext: mocks.resolveAuthContext,
}));

import { GET, POST } from '@/app/api/proxy/pim/[...path]/route';

const TEST_TENANT_ID = 'tenant-a';
const TEST_SUITE_URL = 'https://suite.example';
const TEST_API_KEY_ID = `ak_${TEST_TENANT_ID}_abcdef123456`;
const TEST_API_SECRET = 'sk_test_secret';
const TEST_BEARER_TOKEN = 'Bearer user-token';
const TEST_USER_ID = 'PU-test-user';
const TEST_SKU = 'SKU-1';
const USER_CONTEXT_RESOURCES = ['likes', 'reminders'] as const;

const realFetch = global.fetch;

function createProxyCase(
  resource: (typeof USER_CONTEXT_RESOURCES)[number],
  ...segments: string[]
) {
  const path = ['api', 'b2b', resource, ...segments];
  return {
    label: resource,
    path,
    urlPath: path.join('/'),
  };
}

const bulkStatusCases = USER_CONTEXT_RESOURCES.map((resource) =>
  createProxyCase(resource, 'status', 'bulk'),
);
const toggleCases = USER_CONTEXT_RESOURCES.map((resource) =>
  createProxyCase(resource, 'toggle'),
);
const userListCases = USER_CONTEXT_RESOURCES.map((resource) =>
  createProxyCase(resource, 'user'),
);

function expectForwardedSuiteAuth(headers: Record<string, string>) {
  expect(headers['x-auth-method']).toBe('api-key');
  expect(headers['x-api-key-id']).toBe(TEST_API_KEY_ID);
  expect(headers['x-api-secret']).toBe(TEST_API_SECRET);
  expect(headers.Authorization).toBe(TEST_BEARER_TOKEN);
  expect(headers['x-user-id']).toBe(TEST_USER_ID);
  expect(headers['x-user-type']).toBe('b2b_user');
  expect(headers['x-customer-id']).toBe(TEST_USER_ID);
  expect(new Headers(headers).get('x-api-secret')).toBe(TEST_API_SECRET);

  // Keep the legacy API-key alias for older PIM endpoints while newer
  // commerce-suite routes read the canonical x-api-key-* headers.
  expect(headers['X-API-Key']).toBe(TEST_API_KEY_ID);
}

describe('PIM proxy route', () => {
  beforeEach(() => {
    mocks.resolveTenantApiConfig.mockResolvedValue({
      pimApiUrl: TEST_SUITE_URL,
      apiKeyId: TEST_API_KEY_ID,
      apiSecret: TEST_API_SECRET,
      tenantId: TEST_TENANT_ID,
    });
    mocks.validateToken.mockResolvedValue({
      authenticated: true,
      tenant_id: TEST_TENANT_ID,
      user: {
        id: TEST_USER_ID,
        customers: [
          {
            id: 'customer-1',
            erp_customer_id: 'B_1184',
            addresses: [{ id: 'address-1', erp_address_id: 'ADDR-1' }],
          },
          {
            id: 'customer-2',
            erp_customer_id: 'B_2200',
            addresses: [{ id: 'address-2', erp_address_id: 'ADDR-2' }],
          },
        ],
      },
    });
    mocks.resolveAuthContext.mockResolvedValue({
      success: true,
      context: {
        tenantId: TEST_TENANT_ID,
        ssoApi: { validate: mocks.validateToken },
      },
    });
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it.each(bulkStatusCases)(
    'forwards user bearer auth alongside canonical API-key tenant headers for $label',
    async ({ path, urlPath }) => {
      let calledUrl = '';
      let calledInit: RequestInit | undefined;
      const body = { skus: [TEST_SKU] };

      global.fetch = vi.fn(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          calledUrl = String(url);
          calledInit = init;

          return new Response(
            JSON.stringify({ success: true, data: { ok: true } }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          );
        },
      ) as typeof fetch;

      const req = new NextRequest(
        `http://localhost/api/proxy/pim/${urlPath}?trace=1`,
        {
          method: 'POST',
          headers: {
            Authorization: TEST_BEARER_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );

      const res = await POST(req, {
        params: Promise.resolve({
          path: [...path],
        }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, data: { ok: true } });
      expect(calledUrl).toBe(`${TEST_SUITE_URL}/${urlPath}?trace=1`);
      expect(calledInit?.method).toBe('POST');
      expect(calledInit?.body).toBe(JSON.stringify(body));

      const headers = calledInit?.headers as Record<string, string>;
      expectForwardedSuiteAuth(headers);
      expect(mocks.validateToken).toHaveBeenCalledWith('user-token');
    },
  );

  it.each(toggleCases)(
    'forwards user bearer auth alongside canonical API-key tenant headers for $label toggle',
    async ({ path, urlPath }) => {
      let calledUrl = '';
      let calledInit: RequestInit | undefined;
      const body = { sku: TEST_SKU };

      global.fetch = vi.fn(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          calledUrl = String(url);
          calledInit = init;

          return new Response(
            JSON.stringify({ success: true, data: { ok: true } }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          );
        },
      ) as typeof fetch;

      const req = new NextRequest(`http://localhost/api/proxy/pim/${urlPath}`, {
        method: 'POST',
        headers: {
          Authorization: TEST_BEARER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const res = await POST(req, {
        params: Promise.resolve({
          path: [...path],
        }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, data: { ok: true } });
      expect(calledUrl).toBe(`${TEST_SUITE_URL}/${urlPath}`);
      expect(calledInit?.method).toBe('POST');
      expect(calledInit?.body).toBe(JSON.stringify(body));

      const headers = calledInit?.headers as Record<string, string>;
      expectForwardedSuiteAuth(headers);
      expect(mocks.validateToken).toHaveBeenCalledWith('user-token');
    },
  );

  it.each(userListCases)(
    'forwards user bearer auth alongside canonical API-key tenant headers for $label user list',
    async ({ path, urlPath }) => {
      let calledUrl = '';
      let calledInit: RequestInit | undefined;

      global.fetch = vi.fn(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          calledUrl = String(url);
          calledInit = init;

          return new Response(JSON.stringify({ success: true, data: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        },
      ) as typeof fetch;

      const req = new NextRequest(
        `http://localhost/api/proxy/pim/${urlPath}?page=1&limit=100`,
        {
          method: 'GET',
          headers: {
            Authorization: TEST_BEARER_TOKEN,
          },
        },
      );

      const res = await GET(req, {
        params: Promise.resolve({
          path: [...path],
        }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, data: [] });
      expect(calledUrl).toBe(`${TEST_SUITE_URL}/${urlPath}?page=1&limit=100`);
      expect(calledInit?.method).toBe('GET');
      expect(calledInit?.body).toBeUndefined();

      const headers = calledInit?.headers as Record<string, string>;
      expectForwardedSuiteAuth(headers);
      expect(mocks.validateToken).toHaveBeenCalledWith('user-token');
    },
  );

  it('does not attach trusted user headers when SSO validation fails', async () => {
    mocks.validateToken.mockResolvedValueOnce({
      authenticated: false,
      tenant_id: TEST_TENANT_ID,
    });

    let calledInit: RequestInit | undefined;
    global.fetch = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        calledInit = init;
        return new Response(
          JSON.stringify({ error: 'User identification required' }),
          {
            status: 401,
            headers: { 'content-type': 'application/json' },
          },
        );
      },
    ) as typeof fetch;

    const req = new NextRequest(
      `http://localhost/api/proxy/pim/api/b2b/likes/toggle`,
      {
        method: 'POST',
        headers: {
          Authorization: TEST_BEARER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sku: TEST_SKU }),
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({
        path: ['api', 'b2b', 'likes', 'toggle'],
      }),
    });

    expect(res.status).toBe(401);
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(TEST_BEARER_TOKEN);
    expect(headers['x-user-id']).toBeUndefined();
    expect(headers['x-user-type']).toBeUndefined();
  });

  it('strips spoofed customer pricing context from an anonymous POST search', async () => {
    let calledInit: RequestInit | undefined;
    global.fetch = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        calledInit = init;
        return new Response(
          JSON.stringify({ success: true, data: { results: [] } }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      },
    ) as typeof fetch;

    const req = new NextRequest(
      'http://localhost/api/proxy/pim/api/search/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang: 'it',
          customer_code: 'VICTIM',
          address_code: 'VICTIM-ADDRESS',
          authenticated: true,
          tag_filter: ['vip'],
        }),
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'search', 'search'] }),
    });

    expect(res.status).toBe(200);
    expect(JSON.parse(String(calledInit?.body))).toEqual({ lang: 'it' });
    expect(mocks.validateToken).not.toHaveBeenCalled();
  });

  it('rejects an oversized body before forwarding it to Suite', async () => {
    global.fetch = vi.fn() as typeof fetch;
    const req = new NextRequest(
      'http://localhost/api/proxy/pim/api/search/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(1024 * 1024 + 1),
        },
        body: '{}',
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'search', 'search'] }),
    });

    expect(res.status).toBe(413);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects an oversized streamed search body without Content-Length', async () => {
    global.fetch = vi.fn() as typeof fetch;
    const req = new NextRequest(
      'http://localhost/api/proxy/pim/api/search/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'x'.repeat(1024 * 1024) }),
      },
    );

    expect(req.headers.get('content-length')).toBeNull();
    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'search', 'search'] }),
    });

    expect(res.status).toBe(413);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not apply the search-body limit to unrelated proxy writes', async () => {
    let calledInit: RequestInit | undefined;
    global.fetch = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        calledInit = init;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    ) as typeof fetch;
    const req = new NextRequest(
      'http://localhost/api/proxy/pim/api/b2b/import',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(1024 * 1024 + 1),
        },
        body: '{}',
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'b2b', 'import'] }),
    });

    expect(res.status).toBe(200);
    expect(calledInit?.body).toBe('{}');
  });

  it('loads every category page before expanding a parent filter', async () => {
    mocks.resolveTenantApiConfig.mockResolvedValue({
      pimApiUrl: TEST_SUITE_URL,
      apiKeyId: TEST_API_KEY_ID,
      apiSecret: TEST_API_SECRET,
      tenantId: 'tenant-pagination',
    });
    const categoryPages: number[] = [];
    let forwardedBody = '';
    global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const target = new URL(String(url));
      if (target.pathname.endsWith('/api/b2b/pim/categories')) {
        const page = Number(target.searchParams.get('page'));
        categoryPages.push(page);
        const categories =
          page === 1
            ? [{ category_id: 'root', level: 1, path: [] }]
            : [
                {
                  category_id: 'leaf',
                  level: 3,
                  parent_id: 'root',
                  path: ['root'],
                },
              ];
        return new Response(
          JSON.stringify({
            categories,
            pagination: { page, limit: 200, total: 2, pages: 2 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      forwardedBody = String(init?.body);
      return new Response(
        JSON.stringify({ success: true, data: { results: [] } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;

    const req = new NextRequest(
      'http://localhost/api/proxy/pim/api/search/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang: 'it',
          filters: { category_ancestors: ['root'] },
        }),
      },
    );
    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'search', 'search'] }),
    });

    expect(res.status).toBe(200);
    expect(categoryPages).toEqual([1, 2]);
    expect(JSON.parse(forwardedBody).filters.category_ancestors).toEqual([
      'leaf',
    ]);
  });

  it('retries category loading after a transient failure', async () => {
    mocks.resolveTenantApiConfig.mockResolvedValue({
      pimApiUrl: TEST_SUITE_URL,
      apiKeyId: TEST_API_KEY_ID,
      apiSecret: TEST_API_SECRET,
      tenantId: 'tenant-category-retry',
    });
    let categoryAttempts = 0;
    const forwardedBodies: string[] = [];
    global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const target = new URL(String(url));
      if (target.pathname.endsWith('/api/b2b/pim/categories')) {
        categoryAttempts += 1;
        if (categoryAttempts === 1) {
          return new Response('unavailable', { status: 503 });
        }
        return new Response(
          JSON.stringify({
            categories: [
              { category_id: 'root', level: 1, path: [] },
              {
                category_id: 'leaf',
                level: 3,
                parent_id: 'root',
                path: ['root'],
              },
            ],
            pagination: { page: 1, limit: 200, total: 2, pages: 1 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      forwardedBodies.push(String(init?.body));
      return new Response(
        JSON.stringify({ success: true, data: { results: [] } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;

    const callSearch = () =>
      POST(
        new NextRequest('http://localhost/api/proxy/pim/api/search/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: { category_ancestors: ['root'] },
          }),
        }),
        { params: Promise.resolve({ path: ['api', 'search', 'search'] }) },
      );

    expect((await callSearch()).status).toBe(200);
    expect((await callSearch()).status).toBe(200);
    expect(categoryAttempts).toBe(2);
    expect(
      forwardedBodies.map(
        (body) => JSON.parse(body).filters.category_ancestors,
      ),
    ).toEqual([['root'], ['leaf']]);
  });

  it('downgrades an expired session search to guest context', async () => {
    mocks.validateToken.mockResolvedValueOnce({
      authenticated: false,
      tenant_id: TEST_TENANT_ID,
    });
    let calledInit: RequestInit | undefined;
    global.fetch = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        calledInit = init;
        return new Response(
          JSON.stringify({ success: true, data: { results: [] } }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      },
    ) as typeof fetch;

    const req = new NextRequest(
      'http://localhost/api/proxy/pim/api/search/search',
      {
        method: 'POST',
        headers: {
          Authorization: TEST_BEARER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lang: 'it',
          customer_code: 'B_1184',
          address_code: 'ADDR-1',
          authenticated: true,
        }),
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'search', 'search'] }),
    });

    expect(res.status).toBe(200);
    expect(JSON.parse(String(calledInit?.body))).toEqual({ lang: 'it' });
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers['x-user-id']).toBeUndefined();
    expect(headers['x-user-type']).toBeUndefined();
  });

  it('forwards only an SSO-owned customer/address pair for POST search', async () => {
    let calledInit: RequestInit | undefined;
    global.fetch = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        calledInit = init;
        return new Response(
          JSON.stringify({ success: true, data: { results: [] } }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      },
    ) as typeof fetch;

    const req = new NextRequest(
      'http://localhost/api/proxy/pim/api/search/search',
      {
        method: 'POST',
        headers: {
          Authorization: TEST_BEARER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lang: 'it',
          customer_code: 'B_1184',
          address_code: 'ADDR-1',
          authenticated: false,
          tag_filter: ['forged-tier'],
        }),
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'search', 'search'] }),
    });

    expect(res.status).toBe(200);
    expect(JSON.parse(String(calledInit?.body))).toEqual({
      lang: 'it',
      authenticated: true,
      customer_code: 'B_1184',
      address_code: 'ADDR-1',
    });
    expectForwardedSuiteAuth(calledInit?.headers as Record<string, string>);
  });

  it('forwards the httpOnly access-token cookie as a bearer for Suite verification', async () => {
    let calledInit: RequestInit | undefined;
    global.fetch = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        calledInit = init;
        return new Response(
          JSON.stringify({ success: true, data: { results: [] } }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      },
    ) as typeof fetch;

    const req = new NextRequest(
      'http://localhost/api/proxy/pim/api/search/search',
      {
        method: 'POST',
        headers: {
          cookie: 'auth_token=user-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lang: 'it',
          customer_code: 'B_1184',
          address_code: 'ADDR-1',
        }),
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'search', 'search'] }),
    });

    expect(res.status).toBe(200);
    expect(mocks.validateToken).toHaveBeenCalledWith('user-token');
    expect((calledInit?.headers as Record<string, string>).Authorization).toBe(
      TEST_BEARER_TOKEN,
    );
  });

  it('rejects a foreign customer/address pair before calling Suite', async () => {
    global.fetch = vi.fn() as typeof fetch;
    const req = new NextRequest(
      'http://localhost/api/proxy/pim/api/search/search',
      {
        method: 'POST',
        headers: {
          Authorization: TEST_BEARER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lang: 'it',
          customer_code: 'B_9999',
          address_code: 'ADDR-9',
        }),
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'search', 'search'] }),
    });

    expect(res.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects an address that belongs to a different owned customer', async () => {
    global.fetch = vi.fn() as typeof fetch;
    const req = new NextRequest(
      'http://localhost/api/proxy/pim/api/search/search',
      {
        method: 'POST',
        headers: {
          Authorization: TEST_BEARER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lang: 'it',
          customer_code: 'B_1184',
          address_code: 'ADDR-2',
        }),
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'search', 'search'] }),
    });

    expect(res.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sanitizes GET search query context with POST-equivalent rules', async () => {
    let calledUrl = '';
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      calledUrl = String(url);
      return new Response(
        JSON.stringify({ success: true, data: { results: [] } }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const anonymous = new NextRequest(
      'http://localhost/api/proxy/pim/api/search/search?lang=it&customer_code=VICTIM&address_code=A&authenticated=true&tag_filter=vip',
    );
    const res = await GET(anonymous, {
      params: Promise.resolve({ path: ['api', 'search', 'search'] }),
    });

    expect(res.status).toBe(200);
    const target = new URL(calledUrl);
    expect(target.searchParams.get('lang')).toBe('it');
    expect(target.searchParams.has('customer_code')).toBe(false);
    expect(target.searchParams.has('address_code')).toBe(false);
    expect(target.searchParams.has('authenticated')).toBe(false);
    expect(target.searchParams.has('tag_filter')).toBe(false);
  });

  it('forwards an owned GET search pair and derives authenticated state', async () => {
    let calledUrl = '';
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      calledUrl = String(url);
      return new Response(
        JSON.stringify({ success: true, data: { results: [] } }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const req = new NextRequest(
      'http://localhost/api/proxy/pim/api/search/search?lang=it&customer_code=B_1184&address_code=ADDR-1&authenticated=false&tag_filter=forged',
      { headers: { Authorization: TEST_BEARER_TOKEN } },
    );
    const res = await GET(req, {
      params: Promise.resolve({ path: ['api', 'search', 'search'] }),
    });

    expect(res.status).toBe(200);
    const target = new URL(calledUrl);
    expect(target.searchParams.get('customer_code')).toBe('B_1184');
    expect(target.searchParams.get('address_code')).toBe('ADDR-1');
    expect(target.searchParams.get('authenticated')).toBe('true');
    expect(target.searchParams.has('tag_filter')).toBe(false);
  });

  it.each([
    ['foreign customer', 'B_9999', 'ADDR-9'],
    ['cross-customer address', 'B_1184', 'ADDR-2'],
  ])(
    'rejects a %s in GET search before calling Suite',
    async (_label, customerCode, addressCode) => {
      global.fetch = vi.fn() as typeof fetch;
      const req = new NextRequest(
        `http://localhost/api/proxy/pim/api/search/search?lang=it&customer_code=${customerCode}&address_code=${addressCode}`,
        { headers: { Authorization: TEST_BEARER_TOKEN } },
      );

      const res = await GET(req, {
        params: Promise.resolve({ path: ['api', 'search', 'search'] }),
      });

      expect(res.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );
});
