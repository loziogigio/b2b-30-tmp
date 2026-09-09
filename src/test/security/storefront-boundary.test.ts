import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { buildTenantApiHeaders } from '@/lib/tenant/api-headers';

const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  auth: vi.fn(),
  validate: vi.fn(),
  erp: vi.fn(),
}));
vi.mock('@/lib/tenant', async () => ({
  buildTenantApiHeaders: (await import('@/lib/tenant/api-headers'))
    .buildTenantApiHeaders,
  resolveTenantApiConfig: mocks.config,
}));
vi.mock('@/lib/auth/server', () => ({
  AUTH_COOKIES: { ACCESS_TOKEN: 'auth_token' },
  resolveAuthContext: mocks.auth,
}));
vi.mock('@/lib/erp/customer-promos', () => ({
  getEntitledPromoCodes: vi.fn(),
}));
vi.mock('@/lib/erp/factory', () => ({ getMyMbErpClient: mocks.erp }));
vi.mock('@/lib/erp/coupon-config', () => ({ resolveCouponConfig: vi.fn() }));
vi.mock('@/lib/profile/cs-creds', () => ({
  resolveCsCreds: vi.fn(async () => ({
    csBaseUrl: 'https://suite.test',
    apiKeyId: 'key',
    apiSecret: 'secret',
  })),
}));

import * as proxy from '@/app/api/proxy/pim/[...path]/route';
import * as legacy from '@/app/api/proxy/b2b/[...path]/route';
import { POST as customer } from '@/app/api/b2b/customer/route';
import { POST as closure } from '@/app/api/b2b/cart-closure/route';
import { POST as removeCart } from '@/app/api/b2b/cart/delete/route';
import { POST as removeItems } from '@/app/api/b2b/cart/remove-items/route';
import { POST as erp } from '@/app/api/erp/[...path]/route';
import {
  safeProxyPath,
  storefrontProxyAccess,
} from '@/lib/security/storefront-proxy-policy';
import { resolveStorefrontSession } from '@/lib/auth/storefront-session';

const valid = () => ({
  authenticated: true,
  active: true,
  tenant_id: 'tenant-a',
  exp: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: 'user-a',
    customers: [
      {
        id: 'cust-a',
        erp_customer_id: 'C',
        addresses: [{ erp_address_id: 'A' }],
      },
    ],
  },
});
const methods = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const;
const params = (path: string[]) => ({ params: Promise.resolve({ path }) });
const req = (
  method = 'POST',
  body: unknown = {},
  headers: Record<string, string> = { Authorization: 'Bearer token' },
) =>
  new NextRequest('https://shop.test/api/proxy/pim/request', {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(!['GET', 'HEAD'].includes(method)
      ? { body: JSON.stringify(body) }
      : {}),
  });
const response = (body: unknown = { success: true }) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
const call = (
  method: (typeof methods)[number],
  path: string[],
  request = req(method),
) => (proxy[method] as Function)(request, params(path));
const realFetch = global.fetch;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.config.mockResolvedValue({
    pimApiUrl: 'https://suite.test',
    tenantId: 'tenant-a',
    apiKeyId: 'key',
    apiSecret: 'secret',
  });
  mocks.auth.mockResolvedValue({
    success: true,
    context: { tenantId: 'tenant-a', ssoApi: { validate: mocks.validate } },
  });
  mocks.validate.mockResolvedValue(valid());
  global.fetch = vi.fn(async () => response()) as typeof fetch;
});
afterEach(() => {
  global.fetch = realFetch;
});

describe('default-deny service credential boundary', () => {
  it.each(methods)(
    'blocks admin, maintenance, unknown and encoded paths for %s before resolving credentials',
    async (method) => {
      for (const path of [
        ['api', 'admin', 'users'],
        ['api', 'b2b', 'customers'],
        ['api', 'b2b', 'maintenance'],
        ['api', 'new-endpoint'],
        ['api', 'b2b', 'orders', '%2e%2e'],
        ['api', 'b2b', 'orders', 'x%2fy'],
        ['api', 'b2b', 'orders', '..'],
        ['https:', '', 'evil.test'],
      ]) {
        expect((await call(method, path)).status).toBeGreaterThanOrEqual(400);
      }
      expect(mocks.config).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    '%252e%252e',
    '%2f',
    '%5c',
    'a/b',
    'a\\b',
    'a?b',
    'a#b',
    'a b',
    '..',
    '.',
    '',
    '\u0000',
  ])('rejects dangerous segment %j', (segment) => {
    expect(safeProxyPath(['api', 'b2b', 'orders', segment])).toBeNull();
  });
  it.each(methods)(
    'keeps the legacy credential proxy closed for %s',
    async (method) => {
      const res = await (legacy[method] as Function)(
        req(method),
        params(['admin', 'users']),
      );
      expect(res.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mocks.erp).not.toHaveBeenCalled();
    },
  );
  it('admits exact public reads and reviewed push methods only', () => {
    expect(storefrontProxyAccess('api/public/menu', 'GET')).toBe('public');
    expect(storefrontProxyAccess('api/public/menu/private', 'GET')).toBeNull();
    expect(storefrontProxyAccess('api/search/facet', 'POST')).toBe('public');
    expect(storefrontProxyAccess('api/b2b/push/preferences', 'PATCH')).toBe(
      'session',
    );
    expect(
      storefrontProxyAccess('api/b2b/push/preferences', 'POST'),
    ).toBeNull();
    expect(storefrontProxyAccess('api/b2b/push/subscribe', 'GET')).toBe(
      'session',
    );
  });
  it('allows anonymous correlations reads but blocks correlation creation', async () => {
    expect(
      (await call('POST', ['api', 'b2b', 'correlations'], req('POST', {}, {})))
        .status,
    ).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(
      (await call('GET', ['api', 'b2b', 'correlations'], req('GET', {}, {})))
        .status,
    ).toBe(200);
  });
  it('sets the server-only storefront marker with service credentials', () => {
    expect(
      buildTenantApiHeaders({ apiKeyId: 'key', apiSecret: 'secret' }),
    ).toMatchObject({
      'x-vinc-client': 'storefront',
      'x-api-key-id': 'key',
      'x-api-secret': 'secret',
    });
  });
});

describe('live tenant-bound shopper authentication', () => {
  it.each([
    ['anonymous', null],
    ['invalid', { authenticated: false, active: false }],
    ['foreign tenant', { ...valid(), tenant_id: 'tenant-b' }],
    ['missing tenant', { ...valid(), tenant_id: undefined }],
    ['expired', { ...valid(), exp: 1 }],
    ['expired date', { ...valid(), expires_at: '2000-01-01' }],
    ['invalid expiration', { ...valid(), exp: NaN }],
    ['revoked', { ...valid(), active: false }],
    ['missing user', { ...valid(), user: undefined }],
  ])(
    'denies %s for all private wrappers without forwarding service credentials',
    async (_name, validation) => {
      mocks.validate.mockResolvedValue(validation);
      const actions = [
        () =>
          call(
            'GET',
            ['api', 'b2b', 'orders'],
            req(
              'GET',
              {},
              validation === null ? {} : { Authorization: 'Bearer token' },
            ),
          ),
        () =>
          customer(
            req(
              'POST',
              { customer_id: 'cust-a' },
              validation === null ? {} : { Authorization: 'Bearer token' },
            ),
          ),
        () =>
          closure(
            req(
              'POST',
              { order_id: 'order-a' },
              validation === null ? {} : { Authorization: 'Bearer token' },
            ),
          ),
        () =>
          removeCart(
            req(
              'POST',
              { order_id: 'order-a' },
              validation === null ? {} : { Authorization: 'Bearer token' },
            ),
          ),
        () =>
          removeItems(
            req(
              'POST',
              { order_id: 'order-a', line_numbers: [1] },
              validation === null ? {} : { Authorization: 'Bearer token' },
            ),
          ),
        () =>
          erp(
            req(
              'POST',
              { customer_code: 'C', address_code: 'A' },
              validation === null ? {} : { Authorization: 'Bearer token' },
            ),
            params(['get_orders']),
          ),
      ];
      for (const action of actions) {
        const res = await action();
        expect(res.status).toBe(401);
        expect(res.headers.get('cache-control')).toBe('private, no-store');
      }
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mocks.erp).not.toHaveBeenCalled();
    },
  );
  it('does not fall back from malformed authorization to a valid cookie', async () => {
    expect(
      await resolveStorefrontSession(
        req(
          'GET',
          {},
          { Authorization: 'Basic forged', Cookie: 'auth_token=token' },
        ),
      ),
    ).toBeNull();
    expect(mocks.validate).not.toHaveBeenCalled();
  });
  it('fails closed when SSO validation is unavailable', async () => {
    mocks.validate.mockRejectedValueOnce(new Error('offline'));
    expect((await call('GET', ['api', 'b2b', 'orders'])).status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('forwards a valid httpOnly session with trusted headers and no cache', async () => {
    const res = await call(
      'GET',
      ['api', 'b2b', 'orders'],
      req(
        'GET',
        {},
        {
          Cookie: 'auth_token=token',
          'x-user-id': 'victim',
          'x-user-type': 'admin',
          'x-customer-id': 'victim',
          'x-api-key-id': 'forged',
          'x-vinc-client': 'admin',
        },
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    const init = vi.mocked(global.fetch).mock.calls[0][1]!;
    expect(init).toMatchObject({ redirect: 'error', cache: 'no-store' });
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer token',
      'x-user-id': 'user-a',
      'x-user-type': 'b2b_user',
      'x-api-key-id': 'key',
      'x-vinc-client': 'storefront',
    });
  });
  it('strips forged identity and pricing hints from anonymous search', async () => {
    const res = await call(
      'POST',
      ['api', 'search', 'search'],
      req(
        'POST',
        {
          query: 'x',
          authenticated: true,
          customer_code: 'VICTIM',
          address_code: 'B',
          tag_filter: ['vip'],
        },
        {
          'x-user-id': 'victim',
          'x-user-type': 'admin',
          'x-vinc-client': 'admin',
        },
      ),
    );
    expect(res.status).toBe(200);
    const init = vi.mocked(global.fetch).mock.calls[0][1]!;
    expect(JSON.parse(String(init.body))).toEqual({ query: 'x' });
    expect(init.headers).not.toHaveProperty('x-user-id');
    expect(init.headers).not.toHaveProperty('Authorization');
  });
});

describe('private resource ownership', () => {
  it.each(['..', '%2f', 'order/other'])(
    'rejects unsafe cart lookup id %s before any lookup',
    async (order_id) => {
      expect((await closure(req('POST', { order_id }))).status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );
  it('uses catalog-only ERP pricing despite a browser-selected cart id', async () => {
    const getMultiplePrices = vi.fn(async () => ({}));
    mocks.erp.mockResolvedValue({ getMultiplePrices });
    const res = await erp(
      req('POST', {
        customer_code: 'C',
        address_code: 'A',
        id_cart: 'victim-cart',
        entity_codes: ['one'],
      }),
      params(['get_multiple_prices']),
    );
    expect(res.status).toBe(200);
    expect(getMultiplePrices).toHaveBeenCalledWith(
      expect.objectContaining({ idCart: '0' }),
    );
  });
  it('rejects a foreign customer before lookup', async () => {
    expect(
      (await customer(req('POST', { customer_id: 'victim' }))).status,
    ).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('validates the Suite shipping address and derives the ERP cart server-side', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      response({
        order: {
          customer_code: 'C',
          shipping_address_code: 'A',
          erp_cart_id: 42,
        },
      }),
    );
    const getCartClosureInfo = vi.fn(async () => ({ minimumAmount: 100 }));
    mocks.erp.mockResolvedValue({ getCartClosureInfo });
    const res = await closure(
      req('POST', { order_id: 'order-a', id_cart: 999 }),
    );
    expect(res.status).toBe(200);
    expect(getCartClosureInfo).toHaveBeenCalledWith(42);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });
  it.each([
    { customer_code: 'VICTIM', shipping_address_code: 'A' },
    { customer_code: 'C', shipping_address_code: 'B' },
    { customer_code: 'C', address_code: 'A' },
  ])('rejects foreign or missing order shipping scope %j', async (order) => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      response({ order: { ...order, erp_cart_id: 99 } }),
    );
    expect((await closure(req('POST', { order_id: 'order-a' }))).status).toBe(
      403,
    );
    expect(mocks.erp).not.toHaveBeenCalled();
  });
  it.each([
    ['get_multiple_prices', { customer_code: 'VICTIM', address_code: 'A' }],
    ['get_multiple_prices', { customer_code: 'C', address_code: 'B' }],
    ['get_multiple_prices', { customer_code: 'C' }],
    ['get_multiple_prices', { customer_code: 'cust-a', address_code: 'A' }],
    ['validate_coupon', { customer_code: 'C', codiceInternoCliente: 'VICTIM' }],
    [
      'verify_promo_item',
      { codiceInternoCliente: 'C', address_code: 'A', codiceIndirizzo: 'B' },
    ],
    ['submit_coupon', { codiceInternoCliente: 'C', idElaborazione: 42 }],
    ['check_coupon_cart', { codiceInternoCliente: 'C', id_cart: 42 }],
  ])('rejects unsafe ERP operation %s %j', async (path, body) => {
    expect((await erp(req('POST', body), params([path]))).status).toBe(403);
    expect(mocks.erp).not.toHaveBeenCalled();
  });
  it('verifies a document in the customer/address list before reading its rows', async () => {
    const getInvoices = vi.fn(async () => []);
    const getDocumentRows = vi.fn();
    mocks.erp.mockResolvedValue({ getInvoices, getDocumentRows });
    const res = await erp(
      req('POST', {
        customer_code: 'C',
        address_code: 'A',
        cause: 'F',
        year: '2026',
        number: 'victim',
      }),
      params(['get_document_rows']),
    );
    expect(res.status).toBe(404);
    expect(getDocumentRows).not.toHaveBeenCalled();
  });
});
