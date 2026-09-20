import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SSOApiError } from '@/lib/sso-api';

/**
 * A successful login must forget the customer's cached promo entitlement so
 * the first search after it re-asks the ERP (bellieforti 5687, 2026-09-18:
 * a promo attached in MyMB mid-morning stayed hidden behind a 6h-fresh key).
 *
 * Only the Redis boundary and the SSO client are mocked — the purge helper
 * and the route run for real.
 */
const mocks = vi.hoisted(() => ({
  delByPrefix: vi.fn(async (_prefix: string) => undefined),
  ssoLogin: vi.fn(),
  resolveAuthContext: vi.fn(),
}));

vi.mock('@/lib/cache/redis-cache', () => ({
  cachedJson: vi.fn(),
  delByPrefix: mocks.delByPrefix,
}));
vi.mock('@/lib/erp/factory', () => ({ getMyMbErpClient: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({
  AUTH_COOKIES: { VINC_ACCESS_TOKEN: 'vinc_access_token' },
  AUTH_COOKIE_MAX_AGE_SECONDS: { ACCESS_TOKEN_FALLBACK: 3600 },
  authCookieOptions: vi.fn(() => ({})),
  resolveAuthContext: mocks.resolveAuthContext,
  setAuthTokensServer: vi.fn(),
}));

import { POST } from '@/app/api/auth/login/route';

const TENANT = 'bellieforti-com';

function loginRequest() {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'u@example.com', password: 'pw' }),
  });
}

function ssoUser(customers: Array<Record<string, unknown>>) {
  return {
    access_token: 'at',
    refresh_token: 'rt',
    expires_in: 3600,
    session_id: 'sid',
    user: { id: 'u1', email: 'u@example.com', customers },
  };
}

describe('POST /api/auth/login — promo entitlement purge', () => {
  beforeEach(() => {
    mocks.delByPrefix.mockReset();
    mocks.delByPrefix.mockResolvedValue(undefined);
    mocks.ssoLogin.mockReset();
    mocks.resolveAuthContext.mockResolvedValue({
      success: true,
      context: { tenantId: TENANT, ssoApi: { login: mocks.ssoLogin } },
    });
  });

  it('purges every ERP customer of the user once, under the tenant the proxy keys on', async () => {
    mocks.ssoLogin.mockResolvedValue(
      ssoUser([{ erp_customer_id: '5687' }, { erp_customer_id: '5300' }]),
    );

    const res = await POST(loginRequest());

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mocks.delByPrefix.mock.calls.map((c) => c[0]).sort()).toEqual([
      `promo-entitlement:${TENANT}:5300:`,
      `promo-entitlement:${TENANT}:5687:`,
    ]);
  });

  it('skips a customer record with no ERP code instead of purging a blank prefix', async () => {
    mocks.ssoLogin.mockResolvedValue(
      ssoUser([{ erp_customer_id: '5687' }, { id: 'vinc-only' }]),
    );

    await POST(loginRequest());

    expect(mocks.delByPrefix).toHaveBeenCalledTimes(1);
    expect(mocks.delByPrefix).toHaveBeenCalledWith(
      `promo-entitlement:${TENANT}:5687:`,
    );
  });

  it('purges nothing when the SSO rejects the credentials', async () => {
    mocks.ssoLogin.mockRejectedValue(new SSOApiError(401, 'bad'));

    const res = await POST(loginRequest());

    expect(res.status).toBe(401);
    expect(mocks.delByPrefix).not.toHaveBeenCalled();
  });

  it('still logs the user in when Redis is down', async () => {
    mocks.delByPrefix.mockRejectedValue(new Error('ECONNREFUSED'));
    mocks.ssoLogin.mockResolvedValue(ssoUser([{ erp_customer_id: '5687' }]));

    const res = await POST(loginRequest());

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
