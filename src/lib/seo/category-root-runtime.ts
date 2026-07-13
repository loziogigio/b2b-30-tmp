import {
  normalizeCategoryRootMap,
  parseCategoryRootEnv,
  type CategoryRootMap,
} from './category-root';

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_FAILURE_TTL_MS = 5 * 1000;
const DEFAULT_FETCH_TIMEOUT_MS = 1_500;
const DEFAULT_MAX_CACHE_ENTRIES = 128;

interface CacheEntry {
  value: CategoryRootMap;
  expiresAt: number;
}

export interface CategoryRootResolverOptions {
  baseUrl?: string;
  fallbackMap?: CategoryRootMap;
  fetcher?: typeof fetch;
  now?: () => number;
  cacheTtlMs?: number;
  failureTtlMs?: number;
  timeoutMs?: number;
  maxCacheEntries?: number;
}

export interface TenantHostRequestLike {
  headers: { get(name: string): string | null };
  nextUrl?: { host?: string };
}

function suiteBase(): string {
  const raw =
    process.env.VINC_SUITE_API_BASE ||
    process.env.PIM_API_PRIVATE_URL ||
    process.env.NEXT_PUBLIC_PIM_API_URL ||
    '';
  return raw.replace(/\/$/, '');
}

/** Normalize multi-value proxy headers while retaining an optional dev port. */
export function normalizeTenantHost(rawHost: string): string {
  const first = rawHost.split(',')[0]?.trim().toLowerCase() ?? '';
  if (!first) return '';
  try {
    if (/^https?:\/\//i.test(first)) return new URL(first).host;
  } catch {
    return '';
  }
  return first.replace(/\.$/, '');
}

/** Prefer the original proxy host so middleware never resolves the suite host. */
export function tenantHostFromRequest(req: TenantHostRequestLike): string {
  return (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('x-tenant-hostname') ||
    req.headers.get('host') ||
    req.nextUrl?.host ||
    ''
  );
}

/**
 * Build a host-aware VCS category-root resolver. Its module-level instance is
 * used by middleware; the factory keeps cache, timeout and fallback behaviour
 * deterministic in focused unit tests.
 */
export function createCategoryRootResolver(
  options: CategoryRootResolverOptions = {},
): (host: string) => Promise<CategoryRootMap> {
  const baseUrl = (options.baseUrl ?? suiteBase()).replace(/\/$/, '');
  const fallback = options.fallbackMap
    ? normalizeCategoryRootMap(options.fallbackMap)
    : parseCategoryRootEnv(process.env.NEXT_PUBLIC_CATEGORY_ROOT);
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  const cacheTtlMs = Math.max(1, options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
  const failureTtlMs = Math.max(
    1,
    options.failureTtlMs ?? DEFAULT_FAILURE_TTL_MS,
  );
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS);
  const maxCacheEntries = Math.max(
    1,
    options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES,
  );
  const cache = new Map<string, CacheEntry>();
  const inFlight = new Map<string, Promise<CategoryRootMap>>();

  const setCache = (host: string, value: CategoryRootMap, ttlMs: number) => {
    const timestamp = now();
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= timestamp) cache.delete(key);
    }
    cache.delete(host);
    while (cache.size >= maxCacheEntries) {
      const oldest = cache.keys().next().value as string | undefined;
      if (!oldest) break;
      cache.delete(oldest);
    }
    cache.set(host, { value, expiresAt: timestamp + ttlMs });
  };

  return async (rawHost: string): Promise<CategoryRootMap> => {
    const host = normalizeTenantHost(rawHost);
    if (!baseUrl || !host) return fallback;

    const cached = cache.get(host);
    if (cached && cached.expiresAt > now()) return cached.value;
    if (cached) cache.delete(host);

    const pending = inFlight.get(host);
    if (pending) return pending;

    const load = async (): Promise<CategoryRootMap> => {
      const controller = new AbortController();
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      try {
        const url = new URL('/api/public/b2b/seo-config', `${baseUrl}/`);
        const timeout = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            controller.abort();
            reject(new Error('VCS SEO config request timed out'));
          }, timeoutMs);
        });
        const request = fetcher(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'x-forwarded-host': host,
            'x-tenant-host': host,
          },
          cache: 'no-store',
          signal: controller.signal,
        });
        const response = await Promise.race([request, timeout]);
        if (!response.ok) throw new Error(`VCS SEO config HTTP error`);

        const payload = (await response.json()) as {
          categoryRoot?: unknown;
        };
        if (
          !payload?.categoryRoot ||
          typeof payload.categoryRoot !== 'object' ||
          Array.isArray(payload.categoryRoot)
        ) {
          throw new Error('VCS SEO config categoryRoot is invalid');
        }

        const resolved = normalizeCategoryRootMap(payload.categoryRoot);
        setCache(host, resolved, cacheTtlMs);
        return resolved;
      } catch {
        setCache(host, fallback, failureTtlMs);
        return fallback;
      } finally {
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      }
    };

    const request = load().finally(() => inFlight.delete(host));
    inFlight.set(host, request);
    return request;
  };
}

/** Shared best-effort cache for the lifetime of a middleware isolate. */
export const resolveCategoryRootMapForHost = createCategoryRootResolver();
