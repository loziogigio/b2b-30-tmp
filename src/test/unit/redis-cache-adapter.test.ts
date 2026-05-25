import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/cache/redis-cache', () => ({
  // Fake cachedJson: fresh-miss always produces (good enough for adapter contract).
  cachedJson: vi.fn(async (_key: string, _opts: unknown, producer: () => Promise<unknown>) => producer()),
}));

import { RedisCacheAdapter } from '@/lib/erp/redis-cache-adapter';
import { cachedJson } from '@/lib/cache/redis-cache';

describe('RedisCacheAdapter', () => {
  it('delegates to cachedJson with derived TTLs and a namespaced key', async () => {
    const adapter = new RedisCacheAdapter();
    const out = await adapter.getOrProduce('promo:C:A', 60, async () => 'v');
    expect(out).toBe('v');
    expect(cachedJson).toHaveBeenCalledOnce();
    const [key, opts] = (cachedJson as any).mock.calls[0];
    expect(key).toBe('erp:promo:C:A');
    expect(opts.softTtlMs).toBe(60_000);
    expect(opts.hardTtlSeconds).toBeGreaterThanOrEqual(60);
  });
});
