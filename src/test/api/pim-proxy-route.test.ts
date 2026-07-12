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
        customers: [{ id: 'customer-1', erp_customer_id: 'B_1184' }],
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
});
