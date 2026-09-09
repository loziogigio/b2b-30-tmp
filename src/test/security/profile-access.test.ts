import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  validate: vi.fn(),
  creds: vi.fn(),
}));
vi.mock('@/lib/auth/server', () => ({
  AUTH_COOKIES: { ACCESS_TOKEN: 'auth_token' },
  resolveAuthContext: mocks.auth,
}));
vi.mock('@/lib/profile/cs-creds', () => ({ resolveCsCreds: mocks.creds }));

import { GET as list } from '@/app/api/profile/[model]/route';
import { GET as detail } from '@/app/api/profile/[model]/[id]/route';
import { GET as document } from '@/app/api/profile/document/[model]/[id]/route';
import { getSsoApiForTenant } from '@/lib/sso-api/client';

const valid = () => ({
  authenticated: true,
  active: true,
  tenant_id: 'tenant-a',
  exp: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: 'user-a',
    customers: [
      {
        id: 'customer-a',
        erp_customer_id: 'ERP-A',
        has_all_address_access: false,
        addresses: [{ id: 'address-a', erp_address_id: 'ADDRESS-A' }],
      },
    ],
  },
});
const record = (relation = 'ERP-A', address = 'ADDRESS-A') => ({
  _id: 'record-a',
  relation_id: relation,
  data: {
    destinazione: { code: address },
    pdf_url: 'https://files.test/documenti-clienti/2026/file.pdf',
  },
});
const request = (path: string, token = 'token') =>
  new NextRequest(`https://shop.test/api/profile/${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
const context = (model = 'invoice', id = 'record-a') => ({
  params: Promise.resolve({ model, id }),
});
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
function expectPrivate(response: Response) {
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('vary')).toBe('Cookie, Authorization');
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({
    success: true,
    context: { tenantId: 'tenant-a', ssoApi: { validate: mocks.validate } },
  });
  mocks.validate.mockResolvedValue(valid());
  mocks.creds.mockResolvedValue({
    csBaseUrl: 'https://suite.test',
    apiKeyId: 'key',
    apiSecret: 'secret',
  });
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('DOCUMENTI_CLIENTI_BASE', 'http://overlay.test/files');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('profile routes authenticate before service-key access', () => {
  it('always fetches live SSO validation without caching previous grants', async () => {
    const client = getSsoApiForTenant({
      tenantId: 'tenant-a',
      ssoApiUrl: 'https://suite.test',
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce(json(valid()))
      .mockResolvedValueOnce(json({ authenticated: false }));
    expect((await client.validate('token')).authenticated).toBe(true);
    expect((await client.validate('token')).authenticated).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [url, init] of vi.mocked(fetch).mock.calls) {
      expect(url).toBe('https://suite.test/api/auth/validate');
      expect(init?.cache).toBe('no-store');
      expect(new Headers(init?.headers).get('authorization')).toBe(
        'Bearer token',
      );
    }
  });

  const routes = [
    ['list', list, 'invoice?relation_id=ERP-A'],
    ['detail', detail, 'invoice/record-a'],
    ['document', document, 'document/invoice/record-a'],
  ] as const;
  it.each(routes)(
    '%s rejects an absent session before resolving credentials',
    async (_label, handler, path) => {
      const response = await handler(request(path, ''), context());
      expect(response.status).toBe(401);
      expectPrivate(response);
      expect(mocks.creds).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each(routes)(
    '%s rejects an inactive or cross-tenant session',
    async (_label, handler, path) => {
      for (const patch of [
        { active: false },
        { tenant_id: 'tenant-b' },
        { exp: 1 },
      ]) {
        mocks.validate.mockResolvedValue({ ...valid(), ...patch });
        const response = await handler(request(path), context());
        expect(response.status).toBe(401);
        expectPrivate(response);
      }
      expect(mocks.creds).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each(['ERP-B', 'customer-a'])(
    'rejects unowned/non-ERP customer scope %s before upstream',
    async (relation) => {
      const response = await list(
        request(`invoice?relation_id=${relation}`),
        context(),
      );
      expect(response.status).toBe(403);
      expectPrivate(response);
      expect(mocks.creds).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('rejects ambiguous list scope before upstream', async () => {
    const response = await list(
      request('invoice?relation_id=ERP-A&relation_id=ERP-B'),
      context(),
    );
    expect(response.status).toBe(400);
    expectPrivate(response);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['..', '../invoice', 'x%2Fy', 'x/y', 'x\\y'])(
    'rejects unsafe record path %s',
    async (id) => {
      const response = await detail(
        request('invoice/record-a'),
        context('invoice', id),
      );
      expect(response.status).toBe(400);
      expectPrivate(response);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});

describe('profile scope and protected upstream requests', () => {
  it.each(['historical_order', 'invoice', 'delivery_note'])(
    'permits %s historical addresses absent from the snapshot only with a live all-address grant',
    async (model) => {
      const item = {
        ...record('ERP-A', 'HISTORICAL-ADDRESS'),
        data: {
          ...record('ERP-A', 'HISTORICAL-ADDRESS').data,
          shipping_address: { code: 'HISTORICAL-ADDRESS' },
        },
      };
      for (const allAccess of [true, false]) {
        const validation = valid();
        validation.user.customers[0].has_all_address_access = allAccess;
        mocks.validate.mockResolvedValue(validation);
        vi.mocked(fetch)
          .mockResolvedValueOnce(json({}))
          .mockResolvedValueOnce(json({ data: { items: [item] } }));
        const response = await list(
          request(`${model}?relation_id=ERP-A`),
          context(model),
        );
        expect(response.status).toBe(allAccess ? 200 : 403);
        expectPrivate(response);
      }
    },
  );

  it.each(['credit_exposure', 'payment_schedule', 'invoice'])(
    'requires explicit all-address metadata for customer-wide/unaddressed %s records',
    async (model) => {
      for (const allAccess of [true, false]) {
        const validation = valid();
        validation.user.customers[0].has_all_address_access = allAccess;
        mocks.validate.mockResolvedValue(validation);
        vi.mocked(fetch)
          .mockResolvedValueOnce(json({}))
          .mockResolvedValueOnce(
            json({ data: { _id: 'record-a', relation_id: 'ERP-A', data: {} } }),
          );
        const response = await detail(
          request(`${model}/record-a`),
          context(model),
        );
        expect(response.status).toBe(allAccess ? 200 : 403);
        expectPrivate(response);
      }
    },
  );

  it.each([undefined, 'true', 1])(
    'does not treat missing or malformed all-address metadata %j as permission',
    async (allAccess) => {
      const validation = valid();
      Object.assign(validation.user.customers[0], {
        has_all_address_access: allAccess,
      });
      mocks.validate.mockResolvedValue(validation);
      vi.mocked(fetch)
        .mockResolvedValueOnce(json({}))
        .mockResolvedValueOnce(
          json({ data: record('ERP-A', 'HISTORICAL-ADDRESS') }),
        );
      const response = await detail(request('invoice/record-a'), context());
      expect(response.status).toBe(403);
      expectPrivate(response);
    },
  );

  it('rejects a foreign customer even with live all-address access', async () => {
    const validation = valid();
    validation.user.customers[0].has_all_address_access = true;
    mocks.validate.mockResolvedValue(validation);
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(
        json({ data: record('ERP-B', 'HISTORICAL-ADDRESS') }),
      );
    const response = await detail(request('invoice/record-a'), context());
    expect(response.status).toBe(403);
    expectPrivate(response);
  });

  it('returns owned records using the live session on every uncached, nonredirecting upstream request', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(
        json({ data: { items: [record()], pagination: { total: 1 } } }),
      );
    const response = await list(
      request('invoice?relation_id=ERP-A'),
      context(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      items: [record()],
      pagination: { total: 1 },
    });
    expectPrivate(response);
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [, init] of vi.mocked(fetch).mock.calls) {
      expect(init).toMatchObject({ cache: 'no-store', redirect: 'manual' });
      expect(new Headers(init?.headers).get('x-vinc-client')).toBe(
        'storefront',
      );
      expect(new Headers(init?.headers).get('authorization')).toBe(
        'Bearer token',
      );
    }
  });
  it.each([record('ERP-B'), record('ERP-A', 'ADDRESS-B'), { data: {} }])(
    'does not expose mismatched list records or totals',
    async (item) => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(json({}))
        .mockResolvedValueOnce(
          json({ data: { items: [item], pagination: { total: 999 } } }),
        );
      const response = await list(
        request('invoice?relation_id=ERP-A'),
        context(),
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'Forbidden' });
      expectPrivate(response);
    },
  );
  it.each([record('ERP-B'), record('ERP-A', 'ADDRESS-B')])(
    'denies foreign customer/address detail and download',
    async (item) => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(json({}))
        .mockResolvedValueOnce(json({ data: item }));
      const response = await detail(request('invoice/record-a'), context());
      expect(response.status).toBe(403);
      expectPrivate(response);
      vi.mocked(fetch)
        .mockClear()
        .mockResolvedValueOnce(json({ data: item }));
      const download = await document(
        request('document/invoice/record-a'),
        context(),
      );
      expect(download.status).toBe(403);
      expectPrivate(download);
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it('does not retry an upstream denial with bare service credentials', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ error: 'Forbidden' }, 403));
    const response = await list(
      request('invoice?relation_id=ERP-A'),
      context(),
    );
    expect(await response.json()).toEqual({ available: false, items: [] });
    expectPrivate(response);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not follow a schema redirect', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://foreign.test' },
      }),
    );
    const response = await detail(request('invoice/record-a'), context());
    expect(await response.json()).toEqual({ available: false, item: null });
    expectPrivate(response);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][1]?.redirect).toBe('manual');
  });
  it('does not cache service credential resolution errors', async () => {
    mocks.creds.mockRejectedValue(new Error('unavailable'));
    const response = await list(
      request('invoice?relation_id=ERP-A'),
      context(),
    );
    expect(response.status).toBe(502);
    expectPrivate(response);
  });
});

describe('profile document transport', () => {
  it('permits an all-address historical document then immediately denies it after a live downgrade', async () => {
    const validation = valid();
    validation.user.customers[0].has_all_address_access = true;
    mocks.validate.mockResolvedValue(validation);
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        json({ data: record('ERP-A', 'HISTORICAL-ADDRESS') }),
      )
      .mockResolvedValueOnce(new Response('fixture-pdf'));
    const allowed = await document(
      request('document/invoice/record-a'),
      context(),
    );
    expect(allowed.status).toBe(200);
    expect(await allowed.text()).toBe('fixture-pdf');
    expectPrivate(allowed);

    validation.user.customers[0].has_all_address_access = false;
    vi.mocked(fetch)
      .mockClear()
      .mockResolvedValueOnce(
        json({ data: record('ERP-A', 'HISTORICAL-ADDRESS') }),
      );
    const denied = await document(
      request('document/invoice/record-a'),
      context(),
    );
    expect(denied.status).toBe(403);
    expectPrivate(denied);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledTimes(2);
  });

  it('streams an owned document only through the configured file root', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ data: record() }))
      .mockResolvedValueOnce(
        new Response('fixture-pdf', {
          headers: { 'content-type': 'application/pdf' },
        }),
      );
    const response = await document(
      request('document/invoice/record-a'),
      context(),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('fixture-pdf');
    expectPrivate(response);
    expect(fetch).toHaveBeenLastCalledWith(
      'http://overlay.test/files/2026/file.pdf',
      { cache: 'no-store', redirect: 'manual' },
    );
  });
  it.each([
    'https://files.test/private?path=/documenti-clienti/file.pdf',
    'https://files.test/documenti-clienti/%2fprivate.pdf',
    'https://files.test/documenti-clienti/%252e%252e/private.pdf',
    'https://files.test/documenti-clienti/%5cprivate.pdf',
    'https://files.test/documenti-clienti/%0d%0ax.pdf',
    'https://files.test/documenti-clienti/%zz.pdf',
    'file:///documenti-clienti/file.pdf',
  ])(
    'rejects an unsafe file location %s without fetching the file',
    async (pdf_url) => {
      const item = record();
      item.data.pdf_url = pdf_url;
      vi.mocked(fetch).mockResolvedValueOnce(json({ data: item }));
      const response = await document(
        request('document/invoice/record-a'),
        context(),
      );
      expect(response.status).toBe(404);
      expectPrivate(response);
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it('does not follow file-server redirects', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ data: record() }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: 'http://foreign.test/private' },
        }),
      );
    const response = await document(
      request('document/invoice/record-a'),
      context(),
    );
    expect(response.status).toBe(502);
    expectPrivate(response);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[1][1]?.redirect).toBe('manual');
  });
});
