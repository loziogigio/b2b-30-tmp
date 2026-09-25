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

import {
  GET as list,
  POST as create,
} from '@/app/api/portal-data/[model]/route';
import {
  GET as read,
  PATCH as update,
} from '@/app/api/portal-data/[model]/[id]/route';

const TOKEN = 'aaa.bbb.ccc';
const ID = '0123456789abcdef01234567';
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
        addresses: [{ id: 'address-a', erp_address_id: 'ADDR-A' }],
      },
    ],
  },
});
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
function request(
  path: string,
  init: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
    token?: string | null;
  } = {},
) {
  return new NextRequest(`https://shop.test/api/portal-data/${path}`, {
    method: init.method ?? 'GET',
    headers: {
      authorization: 'Bearer user-token',
      ...(init.token === null
        ? {}
        : { 'x-vinc-script-token': init.token ?? TOKEN }),
      ...(init.body !== undefined
        ? { 'content-type': 'application/json' }
        : {}),
      ...init.headers,
    },
    ...(init.body !== undefined ? { body: init.body } : {}),
  });
}
const ctx = (model = 'preventivi', id = ID) => ({
  params: Promise.resolve({ model, id }),
});
const record = (relation_id = 'ERP-A') => ({
  id: ID,
  relation_id,
  data: { oggetto: 'x' },
  customer_code: 'ERP-A',
  created_at: '2026-09-24T10:00:00.000Z',
  created_by_me: true,
});
const codeOf = async (res: Response) => (await res.json()).error?.code;
function expectPrivate(res: Response) {
  expect(res.headers.get('cache-control')).toBe('private, no-store');
  expect(res.headers.get('vary')).toBe('Cookie, Authorization');
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
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      json({
        items: [record()],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        model: { slug: 'preventivi', relation: 'customer' },
      }),
    ),
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('portal-data BFF', () => {
  it('forwards a list with exactly the storefront credentials and maps the result', async () => {
    const res = await list(
      request('preventivi?customer_code=ERP-A&limit=5&channel=b2c&foo=bar', {
        headers: {
          cookie: 'x=1',
          origin: 'https://shop.test',
          'sec-fetch-site': 'same-origin',
        },
      }),
      ctx(),
    );
    expect(res.status).toBe(200);
    expectPrivate(res);
    expect(await res.json()).toEqual({
      items: [
        {
          id: ID,
          data: { oggetto: 'x' },
          customer_code: 'ERP-A',
          created_at: '2026-09-24T10:00:00.000Z',
          created_by_me: true,
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    const [url, init] = (fetch as any).mock.calls[0];
    const upstream = new URL(url);
    expect(upstream.origin + upstream.pathname).toBe(
      'https://suite.test/api/b2b/portal-data/preventivi/records',
    );
    expect(Object.fromEntries(upstream.searchParams)).toEqual({
      customer_code: 'ERP-A',
      limit: '5',
      channel: 'b2b',
    });
    expect(init.headers).toMatchObject({
      'x-vinc-client': 'storefront',
      'x-api-key-id': 'key',
      'x-api-secret': 'secret',
      Authorization: 'Bearer user-token',
      'x-vinc-script-token': TOKEN,
    });
    expect(JSON.stringify(init.headers)).not.toMatch(/cookie|origin/i);
    expect(init.cache).toBe('no-store');
  });
  it('requires a session and a script token', async () => {
    mocks.validate.mockResolvedValue({ authenticated: false });
    expect(await codeOf(await list(request('preventivi'), ctx()))).toBe(
      'NOT_AUTHENTICATED',
    );
    mocks.validate.mockResolvedValue(valid());
    expect(
      await codeOf(await list(request('preventivi', { token: null }), ctx())),
    ).toBe('SCRIPT_TOKEN_INVALID');
    expect(
      await codeOf(
        await list(request('preventivi', { token: 'not a token' }), ctx()),
      ),
    ).toBe('SCRIPT_TOKEN_INVALID');
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [{ origin: 'https://evil.test' }],
    [{ 'sec-fetch-site': 'cross-site' }],
    [{ 'sec-fetch-site': 'same-site' }],
  ])('refuses cross-site calls %j', async (headers) => {
    const res = await list(
      request('preventivi?customer_code=ERP-A', { headers }),
      ctx(),
    );
    expect(res.status).toBe(403);
    expectPrivate(res);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects bad model names and record ids without calling upstream', async () => {
    expect((await list(request('Preventivi'), ctx('Preventivi'))).status).toBe(
      404,
    );
    expect(
      (
        await read(
          request(`preventivi/not-an-id`),
          ctx('preventivi', 'not-an-id'),
        )
      ).status,
    ).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('refuses customers and addresses outside the session, and duplicate parameters', async () => {
    expect(
      await codeOf(
        await list(request('preventivi?customer_code=ERP-B'), ctx()),
      ),
    ).toBe('FORBIDDEN');
    expect(
      await codeOf(
        await list(
          request('preventivi?customer_code=ERP-A&address_code=ADDR-X'),
          ctx(),
        ),
      ),
    ).toBe('FORBIDDEN');
    expect(
      await codeOf(await list(request('preventivi?limit=1&limit=2'), ctx())),
    ).toBe('INVALID_REQUEST');
    expect(
      await codeOf(
        await list(
          request('preventivi?customer_code=ERP-A&filter[oggetto][regex]=x'),
          ctx(),
        ),
      ),
    ).toBe('INVALID_REQUEST');
    expect(
      await codeOf(
        await list(
          request('preventivi?customer_code=ERP-A&filter[Bad.Field]=x'),
          ctx(),
        ),
      ),
    ).toBe('INVALID_REQUEST');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('validates write bodies', async () => {
    const post = (body: string, headers: Record<string, string> = {}) =>
      create(
        request('preventivi?customer_code=ERP-A', {
          method: 'POST',
          body,
          headers,
        }),
        ctx(),
      );
    expect(
      (await post('{"data":{}}', { 'content-type': 'text/plain' })).status,
    ).toBe(415);
    expect(
      (await post(JSON.stringify({ data: { note: 'x'.repeat(70_000) } })))
        .status,
    ).toBe(413);
    expect(await codeOf(await post('{"data":{},"relation_id":"X"}'))).toBe(
      'INVALID_REQUEST',
    );
    expect(await codeOf(await post('{not json'))).toBe('INVALID_REQUEST');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('creates and updates, passing only { data } upstream', async () => {
    (fetch as any).mockResolvedValueOnce(
      json(
        {
          record: record(),
          model: { slug: 'preventivi', relation: 'customer' },
        },
        201,
      ),
    );
    const created = await create(
      request('preventivi?customer_code=ERP-A', {
        method: 'POST',
        body: JSON.stringify({ data: { oggetto: 'x' } }),
      }),
      ctx(),
    );
    expect(created.status).toBe(201);
    expect(JSON.parse((fetch as any).mock.calls[0][1].body)).toEqual({
      data: { oggetto: 'x' },
    });
    (fetch as any).mockResolvedValueOnce(
      json({
        record: record(),
        model: { slug: 'preventivi', relation: 'customer' },
      }),
    );
    const updated = await update(
      request(`preventivi/${ID}?customer_code=ERP-A`, {
        method: 'PATCH',
        body: JSON.stringify({ data: { note: 'y' } }),
      }),
      ctx(),
    );
    expect(updated.status).toBe(200);
    expect((fetch as any).mock.calls[1][0]).toContain(
      `/api/b2b/portal-data/preventivi/records/${ID}?`,
    );
    expect((fetch as any).mock.calls[1][1].method).toBe('PATCH');
  });
  it('never forwards a record outside the session', async () => {
    (fetch as any).mockResolvedValueOnce(
      json({
        items: [record('ERP-B')],
        pagination: {},
        model: { slug: 'preventivi', relation: 'customer' },
      }),
    );
    const res = await list(request('preventivi?customer_code=ERP-A'), ctx());
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('ERP-B');
    (fetch as any).mockResolvedValueOnce(
      json({
        record: record('other-user'),
        model: { slug: 'appunti', relation: 'portal_user' },
      }),
    );
    expect((await read(request(`appunti/${ID}`), ctx('appunti'))).status).toBe(
      502,
    );
  });
  it('passes CS errors through and maps failures to 502', async () => {
    (fetch as any).mockResolvedValueOnce(
      json({ error: { code: 'RATE_LIMITED', message: 'slow down' } }, 429, {
        'retry-after': '12',
      }),
    );
    const limited = await create(
      request('preventivi?customer_code=ERP-A', {
        method: 'POST',
        body: '{"data":{"oggetto":"x"}}',
      }),
      ctx(),
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('12');
    expect(await codeOf(limited)).toBe('RATE_LIMITED');
    (fetch as any).mockResolvedValueOnce(
      json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'x',
            fields: [{ field: 'oggetto', message: 'is required' }],
          },
        },
        400,
      ),
    );
    const invalid = await create(
      request('preventivi?customer_code=ERP-A', {
        method: 'POST',
        body: '{"data":{}}',
      }),
      ctx(),
    );
    expect((await invalid.json()).error.fields).toEqual([
      { field: 'oggetto', message: 'is required' },
    ]);
    (fetch as any).mockResolvedValueOnce(
      json({ error: 'Endpoint is not available to storefront clients' }, 403),
    );
    expect(
      await codeOf(
        await list(request('preventivi?customer_code=ERP-A'), ctx()),
      ),
    ).toBe('FORBIDDEN');
    (fetch as any).mockResolvedValueOnce(json({}, 500));
    expect(
      (await list(request('preventivi?customer_code=ERP-A'), ctx())).status,
    ).toBe(502);
    (fetch as any).mockRejectedValueOnce(new Error('down'));
    expect(
      (await list(request('preventivi?customer_code=ERP-A'), ctx())).status,
    ).toBe(502);
  });
});
