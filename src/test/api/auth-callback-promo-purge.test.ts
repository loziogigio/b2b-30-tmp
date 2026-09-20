import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * The SSO-redirect login (OAuth callback) is the other way into a session and
 * must purge the customer's cached promo entitlement exactly like the
 * password login does. Only the Redis boundary, the tenant resolver and the
 * token-exchange fetch are mocked.
 */
const mocks = vi.hoisted(() => ({
  delByPrefix: vi.fn(async (_prefix: string) => undefined),
}));

vi.mock('@/lib/cache/redis-cache', () => ({
  cachedJson: vi.fn(),
  delByPrefix: mocks.delByPrefix,
}));
vi.mock('@/lib/erp/factory', () => ({ getMyMbErpClient: vi.fn() }));
vi.mock('@/lib/tenant', () => ({
  isMultiTenant: false,
  resolveTenant: vi.fn(),
}));
vi.mock('@/lib/auth/server', () => ({
  AUTH_COOKIES: {
    VINC_ACCESS_TOKEN: 'vinc_access_token',
    PROFILE_BOOTSTRAP: 'profile_bootstrap',
  },
  AUTH_COOKIE_MAX_AGE_SECONDS: {
    ACCESS_TOKEN_FALLBACK: 3600,
    PROFILE_BOOTSTRAP: 60,
  },
  authCookieOptions: vi.fn(() => ({})),
  getDefaultSsoApiUrl: vi.fn(() => 'https://sso.example'),
  getHostnameFromRequest: vi.fn(() => 'localhost'),
  getPublicOrigin: vi.fn(() => 'http://localhost'),
  OAUTH_CONFIG: { CLIENT_ID: 'cid', CLIENT_SECRET: 'secret' },
  setAuthTokensServer: vi.fn(),
}));

import { GET } from '@/app/api/auth/callback/route';

const TENANT = 'bellieforti-com';
const realFetch = global.fetch;

function callbackRequest() {
  return new NextRequest(
    'http://localhost/api/auth/callback?code=abc&state=%2Fit',
  );
}

function tokenExchange(body: Record<string, unknown>) {
  global.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch;
}

function tokens(customers: Array<Record<string, unknown>>) {
  return {
    tenant_id: TENANT,
    access_token: 'at',
    refresh_token: 'rt',
    expires_in: 900,
    session_id: 'sid',
    user: { id: 'u1', email: 'u@example.com', customers },
  };
}

describe('GET /api/auth/callback — promo entitlement purge', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TENANT_ID = TENANT;
    mocks.delByPrefix.mockReset();
    mocks.delByPrefix.mockResolvedValue(undefined);
  });
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.NEXT_PUBLIC_TENANT_ID;
  });

  it('purges every ERP customer of the user after a successful code exchange', async () => {
    tokenExchange(
      tokens([{ erp_customer_id: '5687' }, { erp_customer_id: '5300' }]),
    );

    const res = await GET(callbackRequest());

    expect(res.status).toBe(307);
    expect(mocks.delByPrefix.mock.calls.map((c) => c[0]).sort()).toEqual([
      `promo-entitlement:${TENANT}:5300:`,
      `promo-entitlement:${TENANT}:5687:`,
    ]);
  });

  it('purges nothing when the IdP answers for another tenant', async () => {
    tokenExchange({
      ...tokens([{ erp_customer_id: '5687' }]),
      tenant_id: 'other-tenant',
    });

    const res = await GET(callbackRequest());

    expect(res.headers.get('location')).toContain('auth_error=tenant_mismatch');
    expect(mocks.delByPrefix).not.toHaveBeenCalled();
  });
});
