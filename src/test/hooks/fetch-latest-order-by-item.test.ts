import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLatestOrderByItem } from '@framework/erp/latest-order';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.clearAllMocks());

function mockJson(body: unknown, ok = true, status = 200) {
  const fn = vi.fn(async () => ({ ok, status, json: async () => body }));
  global.fetch = fn as any;
  return fn;
}

const successBody = {
  status: 'success',
  data: {
    fromDate: '01/01/2024',
    rows: [
      {
        date: '31/07/2026',
        causale: 'OC',
        document: '2026/1110',
        lineNumber: 160,
        ordered: 48,
        settled: 0,
        delivered: 48,
        residual: 0,
        unitPrice: 1.52,
      },
    ],
  },
};

describe('fetchLatestOrderByItem', () => {
  it('posts the customer and entity codes to the in-app ERP route', async () => {
    const fetchMock = mockJson(successBody);

    await fetchLatestOrderByItem({
      customerCode: '5300',
      entityCode: '53295',
    });

    const [url, init] = fetchMock.mock.calls[0] as any;
    expect(url).toBe('/api/erp/get_latest_order_by_item');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      customer_code: '5300',
      entity_code: '53295',
    });
  });

  it('returns the history the route produced', async () => {
    mockJson(successBody);

    const history = await fetchLatestOrderByItem({
      customerCode: '5300',
      entityCode: '53295',
    });

    expect(history.fromDate).toBe('01/01/2024');
    expect(history.rows).toHaveLength(1);
    expect(history.rows[0].document).toBe('2026/1110');
  });

  it('returns an empty history rather than throwing when there is none', async () => {
    mockJson({ status: 'success', data: { fromDate: '', rows: [] } });

    const history = await fetchLatestOrderByItem({
      customerCode: '5300',
      entityCode: '99999',
    });

    expect(history).toEqual({ fromDate: '', rows: [] });
  });

  it('throws when the route responds with an HTTP error', async () => {
    mockJson({ status: 'error', message: 'nope' }, false, 502);

    await expect(
      fetchLatestOrderByItem({ customerCode: '5300', entityCode: '53295' }),
    ).rejects.toThrow(/502/);
  });

  it('does not call the ERP without both codes', async () => {
    const fetchMock = mockJson(successBody);

    const history = await fetchLatestOrderByItem({
      customerCode: '',
      entityCode: '53295',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(history).toEqual({ fromDate: '', rows: [] });
  });

  it('tolerates a success envelope with no data at all', async () => {
    mockJson({ status: 'success' });

    await expect(
      fetchLatestOrderByItem({ customerCode: '5300', entityCode: '53295' }),
    ).resolves.toEqual({ fromDate: '', rows: [] });
  });
});
