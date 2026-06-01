import { describe, it, expect, vi, afterEach } from 'vitest';

// Bypass Redis: run the producer directly so the probe's real fetch logic is exercised.
vi.mock('@/lib/cache/redis-cache', () => ({
  cachedJson: (_key: string, _opts: unknown, producer: () => Promise<unknown>) =>
    producer(),
}));

import {
  probeModelAvailable,
  fetchModelRecords,
  fetchModelRecord,
} from '@/lib/profile/vinc-data-models';

const creds = { csBaseUrl: 'https://cs.example/', apiKeyId: 'ak', apiSecret: 'sk' };

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('probeModelAvailable', () => {
  it('returns false without calling fetch when creds are missing', async () => {
    const f = vi.fn();
    global.fetch = f as any;
    expect(
      await probeModelAvailable(
        { csBaseUrl: '', apiKeyId: '', apiSecret: '' },
        'historical_order',
      ),
    ).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it('maps 200 → true, hitting the schema endpoint with api-key headers', async () => {
    let calledUrl = '';
    let headers: any;
    global.fetch = vi.fn(async (url: any, init: any) => {
      calledUrl = String(url);
      headers = init?.headers;
      return { ok: true } as any;
    }) as any;
    expect(await probeModelAvailable(creds, 'historical_order')).toBe(true);
    expect(calledUrl).toBe(
      'https://cs.example/api/b2b/data-models/historical_order',
    );
    expect(headers['x-auth-method']).toBe('api-key');
    expect(headers['x-api-key-id']).toBe('ak');
  });

  it('maps non-OK → false and a network error → false', async () => {
    global.fetch = vi.fn(async () => ({ ok: false }) as any) as any;
    expect(await probeModelAvailable(creds, 'historical_order')).toBe(false);
    global.fetch = vi.fn(async () => {
      throw new Error('network');
    }) as any;
    expect(await probeModelAvailable(creds, 'historical_order')).toBe(false);
  });
});

describe('fetchModelRecords', () => {
  it('unwraps data.items / data.pagination from the envelope', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          items: [{ _id: '1' }],
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
        },
      }),
    })) as any;
    const page = await fetchModelRecords(
      creds,
      'historical_order',
      new URLSearchParams('relation_id=x'),
    );
    expect(page.items).toHaveLength(1);
    expect(page.pagination?.total).toBe(1);
  });

  it('defaults items to [] when the envelope is empty, and throws on non-OK', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) })) as any;
    const page = await fetchModelRecords(
      creds,
      'historical_order',
      new URLSearchParams(),
    );
    expect(page.items).toEqual([]);

    global.fetch = vi.fn(async () => ({ ok: false, status: 500 })) as any;
    await expect(
      fetchModelRecords(creds, 'historical_order', new URLSearchParams()),
    ).rejects.toThrow();
  });
});

describe('fetchModelRecord', () => {
  it('returns null on 404', async () => {
    global.fetch = vi.fn(async () => ({ status: 404, ok: false })) as any;
    expect(await fetchModelRecord(creds, 'historical_order', 'abc')).toBeNull();
  });

  it('returns data on success and url-encodes the id', async () => {
    let calledUrl = '';
    global.fetch = vi.fn(async (url: any) => {
      calledUrl = String(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { _id: 'a b', total: 9 } }),
      } as any;
    }) as any;
    const rec = await fetchModelRecord(creds, 'historical_order', 'a b');
    expect(rec.total).toBe(9);
    expect(calledUrl).toContain('/records/a%20b');
  });

  it('throws on a non-404 non-OK response', async () => {
    global.fetch = vi.fn(async () => ({ status: 500, ok: false })) as any;
    await expect(
      fetchModelRecord(creds, 'historical_order', 'abc'),
    ).rejects.toThrow();
  });
});
