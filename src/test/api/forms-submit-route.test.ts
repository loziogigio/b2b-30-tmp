import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  process.env.VINC_SUITE_API_BASE = 'https://suite.example.com';
  process.env.VINC_SUITE_API_KEY_ID = 'kid-123';
  process.env.VINC_SUITE_API_SECRET = 'sec-abc';
});

afterEach(() => {
  delete process.env.VINC_SUITE_API_BASE;
  delete process.env.VINC_SUITE_API_KEY_ID;
  delete process.env.VINC_SUITE_API_SECRET;
});

import { POST } from '@/app/api/forms/submit/route';

const makeReq = (body: any, headers: Record<string, string> = {}): Request =>
  new Request('https://b2b.example.com/api/forms/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

describe('POST /api/forms/submit', () => {
  it('forwards headers and translates body to snake_case', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, message: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const req = makeReq(
      { pageSlug: 'faq', formBlockId: 'b1', data: { name: 'X' } },
      { origin: 'https://b2b.example.com' },
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://suite.example.com/api/b2b/b2b/public/forms/submit',
    );
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key-id']).toBe('kid-123');
    expect(init.headers['x-api-secret']).toBe('sec-abc');
    expect(init.headers['origin']).toBe('https://b2b.example.com');
    expect(JSON.parse(init.body)).toEqual({
      page_slug: 'faq',
      form_block_id: 'b1',
      data: { name: 'X' },
    });
  });

  it('returns 503 when API key env vars are missing', async () => {
    delete process.env.VINC_SUITE_API_KEY_ID;
    const req = makeReq({ pageSlug: 'faq', formBlockId: 'b1', data: {} });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/credentials not configured/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 400 when required fields missing from body', async () => {
    const req = makeReq({ pageSlug: 'faq' }); // no formBlockId / data
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns suite error verbatim on suite 4xx', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Field "Email" is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const req = makeReq(
      { pageSlug: 'faq', formBlockId: 'b1', data: {} },
      { origin: 'https://b2b.example.com' },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Field "Email" is required');
  });

  it('returns 502 on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const req = makeReq(
      { pageSlug: 'faq', formBlockId: 'b1', data: {} },
      { origin: 'https://b2b.example.com' },
    );
    const res = await POST(req);
    expect(res.status).toBe(502);
  });
});
