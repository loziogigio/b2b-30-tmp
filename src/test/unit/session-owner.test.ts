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

import { sessionOwnedCustomerCodes } from '@/lib/profile/session-owner';

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
});
