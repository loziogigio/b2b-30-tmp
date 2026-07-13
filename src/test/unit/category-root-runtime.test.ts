import { describe, expect, it, vi } from 'vitest';
import {
  createCategoryRootResolver,
  normalizeTenantHost,
  tenantHostFromRequest,
} from '@/lib/seo/category-root-runtime';

const response = (body: unknown, ok = true) =>
  ({
    ok,
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe('normalizeTenantHost', () => {
  it('normalizes forwarded multi-value hosts and URL-shaped inputs', () => {
    expect(normalizeTenantHost(' Shop.Example.COM:8443, proxy.local ')).toBe(
      'shop.example.com:8443',
    );
    expect(normalizeTenantHost('https://Shop.Example.COM/path')).toBe(
      'shop.example.com',
    );
  });
});

describe('tenantHostFromRequest', () => {
  it('makes middleware prefer the original forwarded tenant host', () => {
    const values: Record<string, string> = {
      'x-forwarded-host': 'custom.example.com',
      'x-tenant-hostname': 'tenant-header.example.com',
      host: 'storefront-container:3000',
    };
    expect(
      tenantHostFromRequest({
        headers: { get: (name) => values[name] ?? null },
        nextUrl: { host: 'request.example.com' },
      }),
    ).toBe('custom.example.com');
  });
});

describe('createCategoryRootResolver', () => {
  it('forwards the tenant host to VCS and caches the authoritative map', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response({
        categoryRoot: { default: 'groups', it: 'prodotti', en: 'products' },
      }),
    ) as unknown as typeof fetch;
    const resolve = createCategoryRootResolver({
      baseUrl: 'https://suite.example.com/',
      fallbackMap: { default: 'fallback' },
      fetcher,
    });

    await expect(resolve('Shop.Example.com')).resolves.toEqual({
      default: 'groups',
      it: 'prodotti',
      en: 'products',
    });
    await expect(resolve('shop.example.com')).resolves.toEqual({
      default: 'groups',
      it: 'prodotti',
      en: 'products',
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetcher).mock.calls[0];
    expect(String(url)).toBe(
      'https://suite.example.com/api/public/b2b/seo-config',
    );
    expect(init?.headers).toMatchObject({
      'x-forwarded-host': 'shop.example.com',
      'x-tenant-host': 'shop.example.com',
    });
    expect(init?.cache).toBe('no-store');
  });

  it('refreshes successful entries after the bounded TTL', async () => {
    let timestamp = 1_000;
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        response({ categoryRoot: { default: 'prodotti' } }),
      ) as unknown as typeof fetch;
    const resolve = createCategoryRootResolver({
      baseUrl: 'https://suite.example.com',
      fetcher,
      now: () => timestamp,
      cacheTtlMs: 100,
    });

    await resolve('shop.example.com');
    timestamp += 99;
    await resolve('shop.example.com');
    timestamp += 1;
    await resolve('shop.example.com');

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keeps custom and unknown hosts in isolated cache entries', async () => {
    const fetcher = vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
      const host = (init?.headers as Record<string, string>)[
        'x-forwarded-host'
      ];
      return Promise.resolve(
        response({
          categoryRoot: {
            default: host === 'custom.example.com' ? 'custom-groups' : 'groups',
          },
        }),
      );
    }) as unknown as typeof fetch;
    const resolve = createCategoryRootResolver({
      baseUrl: 'https://suite.example.com',
      fetcher,
    });

    await expect(resolve('custom.example.com')).resolves.toEqual({
      default: 'custom-groups',
    });
    await expect(resolve('unknown.example.com')).resolves.toEqual({
      default: 'groups',
    });
    await resolve('custom.example.com');
    await resolve('unknown.example.com');

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('uses the env-style fallback briefly when VCS fails', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    const fallbackMap = { default: 'groups', it: 'prodotti' };
    const resolve = createCategoryRootResolver({
      baseUrl: 'https://suite.example.com',
      fallbackMap,
      fetcher,
      failureTtlMs: 50,
    });

    await expect(resolve('shop.example.com')).resolves.toEqual(fallbackMap);
    await expect(resolve('shop.example.com')).resolves.toEqual(fallbackMap);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('aborts and falls back when VCS exceeds the request deadline', async () => {
    vi.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const fetcher = vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
        signal = init?.signal ?? undefined;
        return new Promise<Response>(() => undefined);
      }) as unknown as typeof fetch;
      const resolve = createCategoryRootResolver({
        baseUrl: 'https://suite.example.com',
        fallbackMap: { default: 'fallback' },
        fetcher,
        timeoutMs: 25,
      });

      const pending = resolve('shop.example.com');
      await vi.advanceTimersByTimeAsync(25);

      await expect(pending).resolves.toEqual({ default: 'fallback' });
      expect(signal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
