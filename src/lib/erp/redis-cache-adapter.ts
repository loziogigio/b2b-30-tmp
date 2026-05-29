import type { CacheAdapter } from 'vinc-erp';
import { cachedJson } from '@/lib/cache/redis-cache';

/**
 * CacheAdapter backed by the storefront's stale-while-revalidate Redis cache.
 * `ttlSeconds` is the freshness window; the hard Redis TTL is kept longer so a
 * stale copy survives for stale-if-error.
 */
export class RedisCacheAdapter implements CacheAdapter {
  async getOrProduce<T>(
    key: string,
    ttlSeconds: number,
    producer: () => Promise<T>,
  ): Promise<T> {
    return cachedJson<T>(
      `erp:${key}`,
      {
        softTtlMs: ttlSeconds * 1000,
        hardTtlSeconds: Math.max(ttlSeconds, ttlSeconds * 4),
      },
      producer,
    );
  }
}
