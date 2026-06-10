import { ErpError } from '../erp-client.js';

export interface MymbRequestOpts {
  method?: 'GET' | 'POST';
  params?: Record<string, unknown>;
  body?: unknown;
  fetchImpl?: typeof fetch;
}

/** MYMB transport: Basic auth, optional query params / JSON body, HTTP-error → ErpError. */
export async function mymbRequest<T = any>(
  baseUrl: string,
  authHeader: string,
  endpoint: string,
  opts: MymbRequestOpts = {},
): Promise<T> {
  const method = opts.method ?? 'POST';
  const doFetch = opts.fetchImpl ?? fetch;
  const url = new URL(`${baseUrl}/${endpoint}`);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  let res: Response;
  try {
    res = await doFetch(url.toString(), {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: method === 'POST' && opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    throw new ErpError(`ERP request failed: ${(err as Error).message}`, { endpoint });
  }
  if (!res.ok) {
    throw new ErpError(`ERP request failed: HTTP ${res.status}`, { endpoint, status: res.status });
  }
  return (await res.json()) as T;
}
