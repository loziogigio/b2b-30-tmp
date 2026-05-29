import { describe, it, expect } from 'vitest';
import { NoopCacheAdapter } from '../cache.js';

describe('NoopCacheAdapter', () => {
  it('always calls the producer and returns its value', async () => {
    const cache = new NoopCacheAdapter();
    let calls = 0;
    const producer = async () => { calls++; return 42; };
    expect(await cache.getOrProduce('k', 60, producer)).toBe(42);
    expect(await cache.getOrProduce('k', 60, producer)).toBe(42);
    expect(calls).toBe(2); // no caching
  });
});
