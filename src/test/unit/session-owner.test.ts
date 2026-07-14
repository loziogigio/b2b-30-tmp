import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  resolveAuthContext: vi.fn(),
  validate: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('@/lib/auth', () => ({
  AUTH_COOKIES: { ACCESS_TOKEN: 'auth_token' },
}));
vi.mock('@/lib/auth/server', () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

import {
  sessionOwnedCustomerCodes,
  sessionOwnedCustomers,
} from '@/lib/profile/session-owner';

const request = new NextRequest('http://localhost/api/erp/get_multiple_prices');

describe('sessionOwnedCustomerCodes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: 'access-token' }),
    });
    mocks.resolveAuthContext.mockResolvedValue({
      success: true,
      context: { ssoApi: { validate: mocks.validate } },
    });
  });

  it('returns null when SSO reports an inactive session', async () => {
    mocks.validate.mockResolvedValue({
      authenticated: false,
      user: { customers: [{ erp_customer_id: 'C1' }] },
    });

    expect(await sessionOwnedCustomerCodes(request)).toBeNull();
  });

  it('returns only ERP customer codes from an authenticated session', async () => {
    mocks.validate.mockResolvedValue({
      authenticated: true,
      user: {
        customers: [
          { erp_customer_id: 'C1' },
          { erp_customer_id: '' },
          { erp_customer_id: 'C2' },
        ],
      },
    });

    expect(await sessionOwnedCustomerCodes(request)).toEqual(
      new Set(['C1', 'C2']),
    );
  });

  it('does NOT admit VINC customer ids — its callers compare ERP codes', async () => {
    mocks.validate.mockResolvedValue({
      authenticated: true,
      user: { customers: [{ id: 'vinc-abc', erp_customer_id: '5300' }] },
    });

    const codes = await sessionOwnedCustomerCodes(request);
    expect(codes).toEqual(new Set(['5300']));
    expect(codes?.has('vinc-abc')).toBe(false);
  });
});

describe('sessionOwnedCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: 'access-token' }),
    });
    mocks.resolveAuthContext.mockResolvedValue({
      success: true,
      context: { ssoApi: { validate: mocks.validate } },
    });
  });

  /**
   * The client posts `ERP_STATIC.vinc_customer_id` (the SSO customer's `id`) to
   * /api/b2b/addresses, while the ERP routes send `erp_customer_id`. Keying on
   * only one of them 403s every legitimate address request from the other.
   */
  it('resolves a customer by EITHER its ERP code or its VINC id', async () => {
    mocks.validate.mockResolvedValue({
      authenticated: true,
      user: {
        customers: [
          {
            id: 'vinc-abc',
            erp_customer_id: '5300',
            addresses: [
              { erp_address_id: '1' },
              { erp_address_id: '7' },
              { erp_address_id: '' },
            ],
          },
        ],
      },
    });

    const owned = await sessionOwnedCustomers(request);

    expect(owned?.get('5300')).toEqual(new Set(['1', '7']));
    expect(owned?.get('vinc-abc')).toEqual(new Set(['1', '7']));
    // Both keys must resolve to the SAME allowlist, not two divergent copies.
    expect(owned?.get('5300')).toBe(owned?.get('vinc-abc'));
  });

  it('does not resolve a customer the session does not own', async () => {
    mocks.validate.mockResolvedValue({
      authenticated: true,
      user: {
        customers: [{ id: 'vinc-abc', erp_customer_id: '5300', addresses: [] }],
      },
    });

    const owned = await sessionOwnedCustomers(request);
    expect(owned?.get('9999')).toBeUndefined();
  });

  it('returns null when SSO reports an inactive session', async () => {
    mocks.validate.mockResolvedValue({
      authenticated: false,
      user: { customers: [{ id: 'v', erp_customer_id: '5300' }] },
    });

    expect(await sessionOwnedCustomers(request)).toBeNull();
  });
});
