import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the whole tenant module so this test passes regardless of which
// tenant-config mechanism the route uses (the committed `getTenantConfig`
// path via `isSingleTenant`/`resolveTenant`, or an in-progress
// `resolveTenantApiConfig` refactor). The lang-forwarding behaviour under
// test is independent of how the PIM base URL is resolved.
vi.mock('@/lib/tenant', () => ({
  isSingleTenant: true,
  resolveTenant: vi.fn(async () => null),
  resolveTenantApiConfig: () => ({
    pimApiUrl: 'http://cs',
    apiKeyId: 'k',
    apiSecret: 's',
  }),
  // The route builds tenant auth headers for the upstream fetch; the mock must
  // provide this export too, otherwise the route throws before calling fetch.
  buildTenantApiHeaders: () => ({ Accept: 'application/json' }),
}));

import { GET } from '@/app/api/b2b/home-settings/route';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () => new Response(JSON.stringify({ portal: {} }), { status: 200 }),
    ),
  );
});

describe('home-settings route lang forwarding', () => {
  it('forwards lang to the upstream public/home call', async () => {
    await GET(new Request('http://x/api/b2b/home-settings?lang=de') as any);
    const calledUrl = (fetch as any).mock.calls[0][0] as string;
    expect(calledUrl).toContain('portal=default');
    expect(calledUrl).toContain('lang=de');
  });

  it('omits lang when not provided', async () => {
    await GET(new Request('http://x/api/b2b/home-settings') as any);
    const calledUrl = (fetch as any).mock.calls[0][0] as string;
    expect(calledUrl).toContain('portal=default');
    expect(calledUrl).not.toContain('lang=');
  });
});
