import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn(async () => ({
  ok: true,
  json: async () => ({ success: true, data: { results: [], numFound: 0 } }),
}));
vi.stubGlobal('fetch', fetchMock);

vi.mock('@/lib/tenant', () => ({
  isSingleTenant: true,
  resolveTenant: vi.fn(),
  buildTenantApiHeaders: () => ({ 'Content-Type': 'application/json' }),
}));
vi.mock('@/app/i18n/settings', () => ({
  resolveSupportedLang: (l: string) => l || 'it',
}));
vi.mock('@/lib/cache/tags', () => ({
  cacheTag: () => 'tag',
  SINGLE_TENANT_ID: 't1',
}));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Map()) }));

const { serverFetchPimProducts } = await import('@/lib/pim/server-fetch');

function lastBody() {
  return JSON.parse(
    fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1].body,
  );
}

beforeEach(() => fetchMock.mockClear());

describe('unit: serverFetchPimProducts forwards auth state', () => {
  it('omits authenticated for guests', async () => {
    await serverFetchPimProducts({ lang: 'it', rows: 1 });
    expect(lastBody().authenticated).toBeUndefined();
  });
  it('sets authenticated:true when passed', async () => {
    await serverFetchPimProducts({ lang: 'it', rows: 1, authenticated: true });
    expect(lastBody().authenticated).toBe(true);
  });
});
