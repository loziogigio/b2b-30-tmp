import { describe, it, expect, vi, beforeEach } from 'vitest';
import { serverFetchPimProducts } from '@/lib/pim/server-fetch';

interface FetchOptions {
  headers: Record<string, string>;
  body: string;
  cache?: RequestCache;
  next?: { revalidate: number; tags: string[] };
}

const mocks = vi.hoisted(() => ({
  authToken: undefined as string | undefined,
}));

const fetchMock = vi.fn(async (_url: string, _options: FetchOptions) => ({
  ok: true,
  json: async () => ({ success: true, data: { results: [], numFound: 0 } }),
}));
vi.stubGlobal('fetch', fetchMock);

vi.mock('@/lib/tenant', () => ({
  isSingleTenant: true,
  resolveTenant: vi.fn(),
  buildTenantApiHeaders: (
    _config: unknown,
    options?: { authorization?: string },
  ) => ({
    'Content-Type': 'application/json',
    ...(options?.authorization ? { Authorization: options.authorization } : {}),
  }),
}));
vi.mock('@/lib/auth/cookies', () => ({
  AUTH_COOKIES: { ACCESS_TOKEN: 'auth_token' },
}));
vi.mock('@/app/i18n/settings', () => ({
  resolveSupportedLang: (l: string) => l || 'it',
}));
vi.mock('@/lib/cache/tags', () => ({
  cacheTag: () => 'tag',
  SINGLE_TENANT_ID: 't1',
}));
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Map()),
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === 'auth_token' && mocks.authToken !== undefined
        ? { name, value: mocks.authToken }
        : undefined,
  })),
}));

function lastBody() {
  return JSON.parse(lastRequest().body);
}

function lastRequest(): FetchOptions {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error('Expected serverFetchPimProducts to call fetch');
  return call[1];
}

beforeEach(() => {
  mocks.authToken = undefined;
  fetchMock.mockClear();
});

describe('unit: serverFetchPimProducts forwards SSO credentials', () => {
  it('uses the shared product cache for guests without sending auth state', async () => {
    await serverFetchPimProducts({ lang: 'it', rows: 1 });

    expect(lastBody().authenticated).toBeUndefined();
    expect(lastRequest().headers.Authorization).toBeUndefined();
    expect(lastRequest().cache).toBeUndefined();
    expect(lastRequest().next).toEqual({ revalidate: 300, tags: ['tag'] });
  });

  it('forwards the current SSO bearer and disables shared caching', async () => {
    mocks.authToken = 'sso-access-token';

    await serverFetchPimProducts({ lang: 'it', rows: 1, authenticated: true });

    expect(lastBody().authenticated).toBeUndefined();
    expect(lastRequest().headers.Authorization).toBe('Bearer sso-access-token');
    expect(lastRequest().cache).toBe('no-store');
    expect(lastRequest().next).toBeUndefined();
  });

  it('does not treat an invalid cookie placeholder as a credential', async () => {
    mocks.authToken = ' null ';

    await serverFetchPimProducts({ lang: 'it', rows: 1, authenticated: true });

    expect(lastBody().authenticated).toBeUndefined();
    expect(lastRequest().headers.Authorization).toBeUndefined();
    expect(lastRequest().next).toEqual({ revalidate: 300, tags: ['tag'] });
  });
});
