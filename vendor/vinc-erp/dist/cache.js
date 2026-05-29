"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopCacheAdapter = void 0;
/** No-op adapter: always runs the producer. Default + test double. */
class NoopCacheAdapter {
    async getOrProduce(_key, _ttlSeconds, producer) {
        return producer();
    }
}
exports.NoopCacheAdapter = NoopCacheAdapter;
//# sourceMappingURL=cache.js.map