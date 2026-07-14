import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSessionOwnedCustomers = vi.fn();
const mockResolveTenantApiConfig = vi.fn();

vi.mock('@/lib/profile/session-owner', () => ({
  sessionOwnedCustomers: (...args: any[]) => mockSessionOwnedCustomers(...args),
  sessionOwnedCustomerCodes: vi.fn(),
}));

vi.mock('@/lib/tenant', () => ({
  resolveTenantApiConfig: (...args: any[]) =>
    mockResolveTenantApiConfig(...args),
}));

const { POST } = await import('@/app/api/b2b/addresses/route');

const makeReq = (body: unknown) =>
  new NextRequest('http://localhost/api/b2b/addresses', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

const pimAddress = (id: string, isDefault = false) => ({
  id,
  title: `Address ${id}`,
  isDefault,
  address: {
    street_address: 'Via Roma 1',
    city: 'Milano',
    state: 'MI',
    zip: '20100',
    country: 'IT',
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveTenantApiConfig.mockResolvedValue({
    pimApiUrl: 'http://pim.test',
    tenantId: 'tenant-a',
  });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      addresses: [pimAddress('A', true), pimAddress('B'), pimAddress('C')],
    }),
  }) as any;
});

describe('POST /api/b2b/addresses', () => {
  it('returns 401 when there is no valid session', async () => {
    mockSessionOwnedCustomers.mockResolvedValue(null);
    const res = await POST(makeReq({ customer_id: '1001' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when the customer_id is not owned by the session (IDOR)', async () => {
    mockSessionOwnedCustomers.mockResolvedValue(
      new Map([['1001', new Set(['A'])]]),
    );
    const res = await POST(makeReq({ customer_id: '9999' }));
    expect(res.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns only the addresses enabled for this user', async () => {
    mockSessionOwnedCustomers.mockResolvedValue(
      new Map([['1001', new Set(['A', 'B'])]]),
    );
    const res = await POST(makeReq({ customer_id: '1001' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.addresses.map((a: any) => a.id)).toEqual(['A', 'B']);
  });

  it('fails closed with 403 when the allowlist is empty', async () => {
    mockSessionOwnedCustomers.mockResolvedValue(
      new Map([['1001', new Set<string>()]]),
    );
    const res = await POST(makeReq({ customer_id: '1001' }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe('NO_ADDRESS_FOR_PROFILE');
  });
});
