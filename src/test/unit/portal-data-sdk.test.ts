import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PORTAL_DATA_SDK_SOURCE } from '@/lib/portal-data/sdk-source';
import { ERP_STATIC_STORAGE_KEY } from '@/framework/basic-rest/utils/static';

const ID = '0123456789abcdef01234567';
function install() {
  delete (window as any).vinc;
  new Function(PORTAL_DATA_SDK_SOURCE)();
  return (window as any).vinc.data;
}
function scriptEl(
  token: string | null = 'aaa.bbb.ccc',
  id = 'scr_aaaaaaaaaaaa',
) {
  const el = document.createElement('script');
  el.setAttribute('data-vinc-script', id);
  if (token) el.setAttribute('data-vinc-token', token);
  document.head.appendChild(el);
  return el;
}
const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
function thrown(fn: () => unknown): any {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

beforeEach(() => {
  localStorage.setItem(
    ERP_STATIC_STORAGE_KEY,
    JSON.stringify({ customer_code: 'ERP-A', address_code: '0' }),
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ok({ items: [], pagination: { page: 1 } })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.head.innerHTML = '';
});

describe('vinc.data', () => {
  it('uses the same storage key as the app', () => {
    expect(PORTAL_DATA_SDK_SOURCE).toContain(
      JSON.stringify(ERP_STATIC_STORAGE_KEY),
    );
  });
  it('connect needs the script element and takes the token off the page', () => {
    const data = install();
    expect(thrown(() => data.connect(null))).toMatchObject({
      name: 'VincDataError',
      code: 'NO_SCRIPT_CONTEXT',
    });
    expect(
      thrown(() => data.connect(document.createElement('script'))),
    ).toMatchObject({ code: 'NO_SCRIPT_CONTEXT' });
    const el = scriptEl();
    const db = data.connect(el);
    expect(db.scriptId).toBe('scr_aaaaaaaaaaaa');
    expect(el.hasAttribute('data-vinc-token')).toBe(false);
    expect(Object.isFrozen(db)).toBe(true);
  });
  it('list sends the working customer, paging, sort, filters and the token', async () => {
    const db = install().connect(scriptEl());
    await db.list('preventivi', {
      page: 2,
      limit: 10,
      sort: '-created_at',
      filter: { oggetto: 'Pompa', quantita: { gte: 2 }, stato: ['a', 'b'] },
    });
    const [url, init] = (fetch as any).mock.calls[0];
    const u = new URL(url, 'http://localhost');
    expect(u.pathname).toBe('/api/portal-data/preventivi');
    expect(Object.fromEntries(u.searchParams)).toEqual({
      customer_code: 'ERP-A',
      page: '2',
      limit: '10',
      sort: '-created_at',
      'filter[oggetto]': 'Pompa',
      'filter[quantita][gte]': '2',
      'filter[stato][in]': 'a,b',
    });
    expect(init).toMatchObject({ method: 'GET', credentials: 'same-origin' });
    expect(init.headers['x-vinc-script-token']).toBe('aaa.bbb.ccc');
  });
  it('create and update send { data } as JSON and return the record', async () => {
    const db = install().connect(scriptEl());
    (fetch as any).mockResolvedValueOnce(
      ok({ record: { id: ID, data: { oggetto: 'x' } } }, 201),
    );
    expect(await db.create('preventivi', { oggetto: 'x' })).toEqual({
      id: ID,
      data: { oggetto: 'x' },
    });
    let [url, init] = (fetch as any).mock.calls[0];
    expect(url).toMatch(
      /^\/api\/portal-data\/preventivi\?customer_code=ERP-A$/,
    );
    expect(init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ data: { oggetto: 'x' } }),
    });
    expect(init.headers['Content-Type']).toBe('application/json');
    (fetch as any).mockResolvedValueOnce(ok({ record: { id: ID } }));
    await db.update('preventivi', ID, { note: 'y' });
    [url, init] = (fetch as any).mock.calls[1];
    expect(url).toMatch(new RegExp(`^/api/portal-data/preventivi/${ID}\\?`));
    expect(init.method).toBe('PATCH');
  });
  it('rejects without calling the server for guests and bad input', async () => {
    const guest = install().connect(scriptEl(null));
    await expect(guest.list('preventivi')).rejects.toMatchObject({
      name: 'VincDataError',
      status: 401,
      code: 'NOT_AUTHENTICATED',
    });
    const db = (window as any).vinc.data.connect(scriptEl());
    await expect(db.list('Bad Model')).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
    await expect(db.get('preventivi', 'nope')).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
    await expect(db.create('preventivi', ['x'])).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('surfaces server and network errors as VincDataError', async () => {
    const db = install().connect(scriptEl());
    (fetch as any).mockResolvedValueOnce(
      ok(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'oggetto: is required',
            fields: [{ field: 'oggetto', message: 'is required' }],
          },
        },
        400,
      ),
    );
    await expect(db.create('preventivi', {})).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      fields: [{ field: 'oggetto', message: 'is required' }],
    });
    (fetch as any).mockRejectedValueOnce(new TypeError('offline'));
    await expect(db.list('preventivi')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
  it('cannot be replaced by later scripts, and installing twice keeps the first', () => {
    const data = install();
    expect(() => {
      (window as any).vinc.data = {};
    }).toThrow(TypeError);
    new Function(PORTAL_DATA_SDK_SOURCE)();
    expect((window as any).vinc.data).toBe(data);
  });
});
