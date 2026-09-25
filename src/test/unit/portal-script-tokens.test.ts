// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookie: vi.fn(),
  header: vi.fn(),
  creds: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => mocks.cookie(name) }),
  headers: async () => ({ get: (name: string) => mocks.header(name) }),
}));
vi.mock('@/lib/profile/cs-creds', () => ({
  resolveCsCredsForHost: mocks.creds,
}));

import {
  __resetPortalScriptTokenCache,
  getPortalScriptTokens,
} from '@/lib/portal-data/script-tokens';

const dataScript = {
  label: 'P',
  inlineCode: 'run()',
  placement: 'head' as const,
  loadingStrategy: 'async' as const,
  enabled: true,
  scriptId: 'scr_aaaaaaaaaaaa',
  hasDataAccess: true,
};
const plainScript = {
  ...dataScript,
  scriptId: 'scr_bbbbbbbbbbbb',
  hasDataAccess: undefined,
};
const tokensResponse = (
  expires = new Date(Date.now() + 3_600_000).toISOString(),
) =>
  new Response(
    JSON.stringify({
      tokens: [
        {
          script_id: 'scr_aaaaaaaaaaaa',
          token: 'aaa.bbb.ccc',
          expires_at: expires,
        },
      ],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

beforeEach(() => {
  __resetPortalScriptTokenCache();
  mocks.cookie.mockImplementation((name: string) =>
    name === 'auth_token' ? { value: 'user-token' } : undefined,
  );
  mocks.header.mockImplementation((name: string) =>
    name === 'host' ? 'b2b.hidros.test' : null,
  );
  mocks.creds.mockResolvedValue({
    csBaseUrl: 'https://suite.test',
    apiKeyId: 'key',
    apiSecret: 'secret',
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => tokensResponse()),
  );
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getPortalScriptTokens', () => {
  it('does nothing when no enabled script has data access', async () => {
    expect(
      await getPortalScriptTokens([
        plainScript,
        { ...dataScript, enabled: false },
      ]),
    ).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does nothing for guests', async () => {
    mocks.cookie.mockReturnValue(undefined);
    expect(await getPortalScriptTokens([dataScript])).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });
  it('mints per request with the user token and never through a shared cache', async () => {
    expect(await getPortalScriptTokens([dataScript])).toEqual({
      scr_aaaaaaaaaaaa: 'aaa.bbb.ccc',
    });
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('https://suite.test/api/b2b/portal-data/script-tokens');
    expect(init).toMatchObject({
      method: 'POST',
      cache: 'no-store',
      body: JSON.stringify({ portal: 'default' }),
    });
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer user-token',
      'x-vinc-client': 'storefront',
      'x-api-key-id': 'key',
    });
    expect(mocks.creds).toHaveBeenCalledWith('b2b.hidros.test');
  });
  it('caches per access token only', async () => {
    await getPortalScriptTokens([dataScript]);
    await getPortalScriptTokens([dataScript]);
    expect(fetch).toHaveBeenCalledTimes(1);
    mocks.cookie.mockImplementation((name: string) =>
      name === 'auth_token' ? { value: 'another-user' } : undefined,
    );
    await getPortalScriptTokens([dataScript]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('renders without tokens when CS refuses or fails', async () => {
    (fetch as any).mockResolvedValueOnce(new Response('{}', { status: 401 }));
    expect(await getPortalScriptTokens([dataScript])).toEqual({});
    (fetch as any).mockRejectedValueOnce(new Error('down'));
    expect(await getPortalScriptTokens([dataScript])).toEqual({});
  });
});
