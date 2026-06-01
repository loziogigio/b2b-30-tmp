import { describe, it, expect, vi, beforeEach } from 'vitest';

const { probeModelAvailable, fetchModelRecords, fetchModelRecord } = vi.hoisted(
  () => ({
    probeModelAvailable: vi.fn(),
    fetchModelRecords: vi.fn(),
    fetchModelRecord: vi.fn(),
  }),
);

vi.mock('@/lib/profile/cs-creds', () => ({
  resolveCsCreds: vi.fn(async () => ({
    csBaseUrl: 'https://cs.example',
    apiKeyId: 'k',
    apiSecret: 's',
  })),
}));
vi.mock('@/lib/profile/vinc-data-models', async (orig) => {
  const actual = await (orig as any)();
  return { ...actual, probeModelAvailable, fetchModelRecords, fetchModelRecord };
});

import { GET as listGET } from '@/app/api/profile/[model]/route';
import { GET as recordGET } from '@/app/api/profile/[model]/[id]/route';
import { NextRequest } from 'next/server';

function listReq(model: string, qs = 'relation_id=015892') {
  return new NextRequest(`http://localhost/api/profile/${model}?${qs}`);
}

beforeEach(() => {
  probeModelAvailable.mockReset();
  fetchModelRecords.mockReset();
  fetchModelRecord.mockReset();
});

describe('GET /api/profile/[model]', () => {
  it('404s an unknown model and never calls upstream', async () => {
    const res = await listGET(listReq('erp_settings'), {
      params: Promise.resolve({ model: 'erp_settings' }),
    });
    expect(res.status).toBe(404);
    expect(probeModelAvailable).not.toHaveBeenCalled();
  });

  it('400s when relation_id is missing', async () => {
    const res = await listGET(listReq('historical_order', ''), {
      params: Promise.resolve({ model: 'historical_order' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns available:false when the model is not available', async () => {
    probeModelAvailable.mockResolvedValue(false);
    const res = await listGET(listReq('historical_order'), {
      params: Promise.resolve({ model: 'historical_order' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ available: false, items: [] });
    expect(fetchModelRecords).not.toHaveBeenCalled();
  });

  it('returns records when available', async () => {
    probeModelAvailable.mockResolvedValue(true);
    fetchModelRecords.mockResolvedValue({
      items: [{ _id: '1', data: { document_number: 'OC/1' } }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    const res = await listGET(listReq('historical_order'), {
      params: Promise.resolve({ model: 'historical_order' }),
    });
    const json = await res.json();
    expect(json.available).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it('502s when records fetch fails after a positive probe', async () => {
    probeModelAvailable.mockResolvedValue(true);
    fetchModelRecords.mockRejectedValue(new Error('upstream down'));
    const res = await listGET(listReq('historical_order'), {
      params: Promise.resolve({ model: 'historical_order' }),
    });
    expect(res.status).toBe(502);
  });
});

describe('GET /api/profile/[model]/[id]', () => {
  it('returns available:false + item:null on 404', async () => {
    probeModelAvailable.mockResolvedValue(true);
    fetchModelRecord.mockResolvedValue(null);
    const res = await recordGET(
      new NextRequest('http://localhost/api/profile/historical_order/abc'),
      { params: Promise.resolve({ model: 'historical_order', id: 'abc' }) },
    );
    const json = await res.json();
    expect(json).toEqual({ available: true, item: null });
  });

  it('returns the record when found', async () => {
    probeModelAvailable.mockResolvedValue(true);
    fetchModelRecord.mockResolvedValue({ _id: 'abc', data: { total: 9 } });
    const res = await recordGET(
      new NextRequest('http://localhost/api/profile/historical_order/abc'),
      { params: Promise.resolve({ model: 'historical_order', id: 'abc' }) },
    );
    const json = await res.json();
    expect(json.available).toBe(true);
    expect(json.item.data.total).toBe(9);
  });
});
