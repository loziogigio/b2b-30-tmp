/**
 * Read-through cache contract. `getOrProduce` returns a cached value if fresh
 * within `ttlSeconds`, otherwise runs `producer`, stores, and returns it.
 * Implementations may serve stale on producer error.
 */
export interface CacheAdapter {
    getOrProduce<T>(key: string, ttlSeconds: number, producer: () => Promise<T>): Promise<T>;
}
/** No-op adapter: always runs the producer. Default + test double. */
export declare class NoopCacheAdapter implements CacheAdapter {
    getOrProduce<T>(_key: string, _ttlSeconds: number, producer: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=cache.d.ts.map