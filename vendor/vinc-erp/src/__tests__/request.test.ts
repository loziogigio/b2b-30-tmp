import { describe, it, expect, vi } from 'vitest';
import { mymbRequest } from '../mymb/request.js';
import { ErpError } from '../erp-client.js';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  });
}

describe('mymbRequest', () => {
  it('GET: builds the URL with params + Basic auth header, returns parsed JSON', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: 1 }));
    const out = await mymbRequest('http://erp:8884/MyMB/web', 'Basic xyz', 'GetX', {
      method: 'GET', params: { a: '1', b: undefined }, fetchImpl,
    });
    expect(out).toEqual({ ok: 1 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe('http://erp:8884/MyMB/web/GetX?a=1');
    expect((init as RequestInit).method).toBe('GET');
    expect((init as any).headers.Authorization).toBe('Basic xyz');
  });

  it('throws ErpError on non-OK HTTP', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 500));
    await expect(
      mymbRequest('http://erp/web', 'Basic xyz', 'GetX', { method: 'GET', fetchImpl }),
    ).rejects.toBeInstanceOf(ErpError);
  });
});
