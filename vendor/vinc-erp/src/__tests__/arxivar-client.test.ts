import { describe, it, expect, vi } from 'vitest';
import { ArxivarClient } from '../mymb/arxivar-client.js';

function fakeFetch(json: unknown, ok = true) {
  return vi.fn(async (_url: string) =>
    ({ ok, status: ok ? 200 : 500, json: async () => json }) as unknown as Response,
  );
}

const cfg = (fetchImpl: any) => ({
  baseUrl: 'http://host:8883/MyMB/Service/web',
  authHeader: 'Basic Zm9vOmJhcg==',
  fetchImpl,
});

describe('ArxivarClient.getInvoicePdf', () => {
  it('maps cause/year/number/docType to Causale/Anno/Numero/TipoDocumento and returns Contenuto', async () => {
    const f = fakeFetch({ GetInvoicesFromArxivarIXResult: { Data: [{ Contenuto: 'JVBERi0x' }] } });
    const client = new ArxivarClient(cfg(f));
    const pdf = await client.getInvoicePdf({ cause: 'VEN', year: 2026, number: 670, docType: 1 });
    expect(pdf).toBe('JVBERi0x');
    const url = new URL((f.mock.calls[0][0]) as string);
    expect(url.pathname).toBe('/MyMB/Service/web/GetInvoicesFromArxivarIX');
    expect(url.searchParams.get('Causale')).toBe('VEN');
    expect(url.searchParams.get('Anno')).toBe('2026');
    expect(url.searchParams.get('Numero')).toBe('670');
    expect(url.searchParams.get('TipoDocumento')).toBe('1');
  });

  it('defaults cause to VEN when omitted', async () => {
    const f = fakeFetch({ GetInvoicesFromArxivarIXResult: { Data: [{ Contenuto: 'AAA' }] } });
    await new ArxivarClient(cfg(f)).getInvoicePdf({ year: 2026, number: 1 });
    const url = new URL((f.mock.calls[0][0]) as string);
    expect(url.searchParams.get('Causale')).toBe('VEN');
  });

  it('returns null when Data is empty (document not archived)', async () => {
    const f = fakeFetch({ GetInvoicesFromArxivarIXResult: { Data: [] } });
    await expect(
      new ArxivarClient(cfg(f)).getInvoicePdf({ year: 2026, number: 2 }),
    ).resolves.toBeNull();
  });

  it('returns null when Data is null (document not archived)', async () => {
    const f = fakeFetch({ GetInvoicesFromArxivarIXResult: { Data: null } });
    await expect(
      new ArxivarClient(cfg(f)).getInvoicePdf({ year: 2026, number: 3 }),
    ).resolves.toBeNull();
  });

  it('throws on a transport/HTTP error (archive unreachable)', async () => {
    const f = fakeFetch({}, false); // ok:false -> HTTP 500 -> mymbRequest throws
    await expect(
      new ArxivarClient(cfg(f)).getInvoicePdf({ year: 2026, number: 4 }),
    ).rejects.toThrow();
  });
});
