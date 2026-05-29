/**
 * Redis-backed read cache for storefront data.
 *
 * Why Redis (vs Next.js's in-process Data Cache): the value survives server
 * restarts, is shared across processes/instances, and we control TTL +
 * staleness explicitly. This is what absorbs transient remote-Mongo blips —
 * a momentary DB failure serves the last-good value from Redis instead of
 * rendering an empty page.
 *
 * Design — `cachedJson` implements stale-while-revalidate + stale-if-error:
 *   • fresh hit (age < softTtl)      → return cached immediately
 *   • stale hit (age ≥ softTtl)      → refetch; on success update, on error
 *                                      serve the stale copy
 *   • miss                           → fetch, store, return
 *   • Redis unavailable / not set    → bypass cache, call the producer directly
 *
 * The hard Redis TTL is deliberately longer than `softTtl` so a stale copy is
 * still around to serve when the source errors.
 *
 * Invalidation is push-based: the PIM publishes cache-tag events on Redis
 * pub/sub (see revalidation-subscriber.ts), which deletes the matching keys.
 */
import Redis from 'ioredis';

export const REDIS_CACHE_PREFIX = 'vinc-b2b:cache:';

// Survive dev HMR — the module is re-evaluated on hot reload, the global isn't.
const g = globalThis as unknown as {
  __b2bRedisCache?: Redis | null;
  __b2bRedisCacheDisabled?: boolean;
};

/** Lazily create a (command) Redis client. Returns null when REDIS_HOST is
 *  unset or a prior connection attempt has been marked unusable. */
function getClient(): Redis | null {
  if (g.__b2bRedisCacheDisabled) return null;
  if (g.__b2bRedisCache) return g.__b2bRedisCache;

  const host = process.env.REDIS_HOST;
  if (!host) {
    g.__b2bRedisCacheDisabled = true;
    return null;
  }

  const client = new Redis({
    host,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    // Don't let cache I/O ever hang a request — fail fast and fall back.
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: false,
  });
  client.on('error', (err) =>
    console.warn('[redis-cache] redis error:', err.message),
  );
  g.__b2bRedisCache = client;
  return client;
}

interface Envelope<T> {
  storedAt: number;
  data: T;
}

export interface CacheOptions {
  /** Logical freshness window in ms. Past this, a refetch is attempted but the
   *  stale copy is still served on error. */
  softTtlMs: number;
  /** Hard Redis TTL in seconds — how long a stale copy lingers for stale-if-error. */
  hardTtlSeconds: number;
}

/**
 * Get-or-produce a JSON value through Redis with stale-while-revalidate.
 * Falls back to calling `producer()` directly if Redis is unavailable, so the
 * cache is never a hard dependency.
 */
export async function cachedJson<T>(
  key: string,
  opts: CacheOptions,
  producer: () => Promise<T>,
): Promise<T> {
  const client = getClient();
  if (!client) return producer();

  const fullKey = `${REDIS_CACHE_PREFIX}${key}`;

  let envelope: Envelope<T> | null = null;
  try {
    const raw = await client.get(fullKey);
    if (raw) envelope = JSON.parse(raw) as Envelope<T>;
  } catch (err) {
    // Redis read failed — don't let the cache break the request.
    console.warn('[redis-cache] get failed:', (err as Error).message);
    return producer();
  }

  const isFresh =
    envelope != null && Date.now() - envelope.storedAt < opts.softTtlMs;

  if (envelope && isFresh) return envelope.data;

  // Miss or stale → (re)produce.
  try {
    const data = await producer();
    // Best-effort write; never block the response on the cache write.
    void client
      .set(
        fullKey,
        JSON.stringify({ storedAt: Date.now(), data } satisfies Envelope<T>),
        'EX',
        opts.hardTtlSeconds,
      )
      .catch((err) =>
        console.warn('[redis-cache] set failed:', (err as Error).message),
      );
    return data;
  } catch (err) {
    // Producer failed. Serve stale if we have it (stale-if-error); else rethrow.
    if (envelope) {
      console.warn(
        `[redis-cache] producer failed for ${key}, serving stale:`,
        (err as Error).message,
      );
      return envelope.data;
    }
    throw err;
  }
}

/** Delete all cache keys under a logical prefix (e.g. `home-template:hidros-it:`). */
export async function delByPrefix(prefix: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  const match = `${REDIS_CACHE_PREFIX}${prefix}*`;
  try {
    let cursor = '0';
    do {
      const [next, keys] = await client.scan(
        cursor,
        'MATCH',
        match,
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length) await client.del(...keys);
    } while (cursor !== '0');
  } catch (err) {
    console.warn('[redis-cache] delByPrefix failed:', (err as Error).message);
  }
}
