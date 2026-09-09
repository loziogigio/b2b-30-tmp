/**
 * Regression for the search-list N+1: every product row asked the "bulk"
 * status endpoint for its own SKU, so a 60-row page made 60 requests. The
 * batcher coalesces calls made in the same window into one request, answers
 * repeats from cache, and chunks at the Suite's 100-SKU limit.
 */
import { describe, expect, it, vi } from 'vitest';
import { createStatusBatcher } from '@/lib/status-batcher';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const truthy = (skus: string[]) =>
  Object.fromEntries(skus.map((s) => [s, s.endsWith('1')]));

describe('createStatusBatcher', () => {
  it('coalesces calls made in the same window into one request', async () => {
    const fetcher = vi.fn(async (skus: string[]) => truthy(skus));
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    const [a, c] = await Promise.all([b.load(['A1']), b.load(['B2', 'C1'])]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0].sort()).toEqual(['A1', 'B2', 'C1']);
    expect(a).toEqual({ A1: true });
    expect(c).toEqual({ B2: false, C1: true });
  });

  it('answers an already-checked SKU from cache without a request', async () => {
    const fetcher = vi.fn(async (skus: string[]) => truthy(skus));
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    await b.load(['A1']);
    const again = await b.load(['A1']);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(again).toEqual({ A1: true });
  });

  it('joins an in-flight request instead of duplicating it', async () => {
    const d = deferred<Record<string, boolean>>();
    const fetcher = vi.fn(() => d.promise);
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    const first = b.load(['A1']);
    await new Promise((r) => setTimeout(r, 5)); // flush fired, fetch pending
    expect(fetcher).toHaveBeenCalledTimes(1);
    const second = b.load(['A1']);
    d.resolve({ A1: true });
    expect(await first).toEqual({ A1: true });
    expect(await second).toEqual({ A1: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('splits more than maxPerRequest SKUs into several requests', async () => {
    const fetcher = vi.fn(async (skus: string[]) => truthy(skus));
    const b = createStatusBatcher(fetcher, { delayMs: 0, maxPerRequest: 100 });
    const skus = Array.from({ length: 150 }, (_, i) => `S${i}`);
    const res = await b.load(skus);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      fetcher.mock.calls.map((c) => c[0].length).sort((a, b) => a - b),
    ).toEqual([50, 100]);
    expect(Object.keys(res)).toHaveLength(150);
  });

  it('rejects its callers on failure and leaves the SKUs retryable', async () => {
    const fetcher = vi
      .fn<(skus: string[]) => Promise<Record<string, boolean>>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockImplementation(async (skus) => truthy(skus));
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    await expect(b.load(['A1'])).rejects.toThrow('boom');
    expect(await b.load(['A1'])).toEqual({ A1: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('reset clears the cache so the next call requests again', async () => {
    const fetcher = vi.fn(async (skus: string[]) => truthy(skus));
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    await b.load(['A1']);
    b.reset();
    await b.load(['A1']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('trims, dedupes and drops empty SKUs before requesting', async () => {
    const fetcher = vi.fn(async (skus: string[]) => truthy(skus));
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    const res = await b.load([' A1 ', 'A1', '', '  ']);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toEqual(['A1']);
    expect(res).toEqual({ A1: true });
  });

  it('remembers SKUs the server did not return so they are not re-asked', async () => {
    const fetcher = vi.fn(async () => ({}));
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    expect(await b.load(['Z9'])).toEqual({});
    expect(await b.load(['Z9'])).toEqual({});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('resolves an empty input without a request', async () => {
    const fetcher = vi.fn(async (skus: string[]) => truthy(skus));
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    expect(await b.load([])).toEqual({});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('prime records a local value so a later load does not request it', async () => {
    const fetcher = vi.fn(async (skus: string[]) => truthy(skus));
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    b.prime({ A2: true });
    expect(await b.load(['A2'])).toEqual({ A2: true });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('prime overrides a previously fetched value', async () => {
    const fetcher = vi.fn(async (skus: string[]) => truthy(skus));
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    expect(await b.load(['A2'])).toEqual({ A2: false });
    b.prime({ A2: true });
    expect(await b.load(['A2'])).toEqual({ A2: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('reset keeps a batch that has not been sent yet (rows mount before the provider effect)', async () => {
    const fetcher = vi.fn(async (skus: string[]) => truthy(skus));
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    const p = b.load(['A1']);
    b.reset(); // provider-level reset fires after the children's effects
    expect(await p).toEqual({ A1: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('reset discards a response that was in flight for the previous user', async () => {
    const d = deferred<Record<string, boolean>>();
    const fetcher = vi.fn(() => d.promise);
    const b = createStatusBatcher(fetcher, { delayMs: 0 });
    const p = b.load(['A1']);
    await new Promise((r) => setTimeout(r, 5)); // sent
    b.reset();
    d.resolve({ A1: true });
    expect(await p).toEqual({});
    // nothing cached from the stale response: a new load asks again
    fetcher.mockImplementation(async (skus: string[]) => truthy(skus));
    expect(await b.load(['A1'])).toEqual({ A1: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
