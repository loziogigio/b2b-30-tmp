import { describe, it, expect, vi } from 'vitest';
import { MyMbErpClient } from '../mymb/mymb-erp-client.js';
import { NoopCacheAdapter } from '../cache.js';
import { ErpError } from '../erp-client.js';
import type { MyMbErpSettings } from '../types/pricing.js';

const settings: MyMbErpSettings = {
  packagingOptionsId: [1],
  isManagedSubstitutes: false,
  isManagedSupplierOrder: false,
  cases: { '0': { label: 'OK', addToCart: true } },
  updatePromoSeconds: 21600,
  updateAvailableAgainSeconds: 21600,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  });
}

function makeClient(fetchImpl: typeof fetch) {
  return new MyMbErpClient({
    baseUrl: 'http://erp:8896/MyMB/web',
    authHeader: 'Basic xyz',
    settings,
    cache: new NoopCacheAdapter(),
    fetchImpl,
  });
}

describe('MyMbErpClient.getMultiplePrices', () => {
  it('returns {} for empty entityCodes without calling fetch', async () => {
    const f = vi.fn();
    const client = makeClient(f as unknown as typeof fetch);
    expect(await client.getMultiplePrices({ customerCode: 'C', addressCode: 'A', entityCodes: [] })).toEqual({});
    expect(f).not.toHaveBeenCalled();
  });

  it('maps GetPrezzaturaMultipla rows into an entity-keyed map', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({
      GetPrezzaturaMultiplaResult: {
        ReturnCode: 0,
        ListaPrezzatura: [
          { CodiceInternoArticolo: 'ART1', IVAPercentuale: 22, QtaDisponibile: 5,
            Prezzo: 100, PrezzoNettoXVisualizzazione: 90,
            TipoListinoUtilizzato: 'L', CodiceListinoUtilizzato: 'C',
            ImballiArticolo: { ListaImballoXArticolo: [] } },
        ],
      },
    }));
    const client = makeClient(f as unknown as typeof fetch);
    const out = await client.getMultiplePrices({
      customerCode: 'C', addressCode: 'A', entityCodes: ['ART1'], quantityList: [1],
    });
    expect(Object.keys(out)).toEqual(['ART1']);
    expect(out.ART1.net_price).toBe(90);
    expect(f).toHaveBeenCalledOnce();
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain('/GetPrezzaturaMultipla');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as any).headers.Authorization).toBe('Basic xyz');
  });

  it('throws ErpError when ReturnCode != 0', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({
      GetPrezzaturaMultiplaResult: { ReturnCode: 3, Message: 'bad' },
    }));
    const client = makeClient(f as unknown as typeof fetch);
    await expect(client.getMultiplePrices({
      customerCode: 'C', addressCode: 'A', entityCodes: ['ART1'],
    })).rejects.toBeInstanceOf(ErpError);
  });

  it('throws ErpError on a non-2xx HTTP status', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    const client = makeClient(f as unknown as typeof fetch);
    await expect(client.getMultiplePrices({
      customerCode: 'C', addressCode: 'A', entityCodes: ['ART1'],
    })).rejects.toBeInstanceOf(ErpError);
  });

  it('rejects with ErpError when fetch throws (network error)', async () => {
    const f = vi.fn().mockRejectedValue(new Error('network'));
    const client = makeClient(f as unknown as typeof fetch);
    await expect(client.getMultiplePrices({
      customerCode: 'C', addressCode: 'A', entityCodes: ['ART1'],
    })).rejects.toBeInstanceOf(ErpError);
  });
});

describe('MyMbErpClient substitute fallback', () => {
  const subSettings: MyMbErpSettings = { ...settings, isManagedSubstitutes: true };

  function makeSubClient(fetchImpl: typeof fetch) {
    return new MyMbErpClient({
      baseUrl: 'http://erp:8896/MyMB/web',
      authHeader: 'Basic xyz',
      settings: subSettings,
      cache: new NoopCacheAdapter(),
      fetchImpl,
    });
  }

  it('fetches alternatives and populates prod_substitution when unavailable + managed subs', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        GetPrezzaturaMultiplaResult: {
          ReturnCode: 0,
          ListaPrezzatura: [
            { CodiceInternoArticolo: 'ART1', IVAPercentuale: 22, QtaDisponibile: 0,
              Prezzo: 100, PrezzoNettoXVisualizzazione: 90,
              TipoListinoUtilizzato: 'L', CodiceListinoUtilizzato: 'C',
              ImballiArticolo: { ListaImballoXArticolo: [] } },
          ],
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        GetListaArticoliAlternativiResult: {
          ListaPrezzatura: [
            { CodiceInternoArticolo: 'SUB1' },
            { CodiceInternoArticolo: 'SUB2' },
          ],
        },
      }));
    const client = makeSubClient(f as unknown as typeof fetch);
    const out = await client.getMultiplePrices({
      customerCode: 'C', addressCode: 'A', entityCodes: ['ART1'], quantityList: [1],
    });
    expect(out.ART1.prod_substitution).toEqual(['SUB1', 'SUB2']);
    expect(out.ART1.product_label_action.prod_substitution).toEqual(['SUB1', 'SUB2']);
    expect(f).toHaveBeenCalledTimes(2);
    expect(String(f.mock.calls[1][0])).toContain('/GetListaArticoliAlternativi');
  });
});

describe('MyMbErpClient.getSubstituteItems', () => {
  it('returns the list of CodiceInternoArticolo from the result', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({
      GetListaArticoliAlternativiResult: {
        ListaPrezzatura: [
          { CodiceInternoArticolo: 'SUB1' },
          { CodiceInternoArticolo: 'SUB2' },
        ],
      },
    }));
    const client = makeClient(f as unknown as typeof fetch);
    expect(await client.getSubstituteItems('ART1')).toEqual(['SUB1', 'SUB2']);
  });

  it('returns [] when ListaPrezzatura is missing', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({
      GetListaArticoliAlternativiResult: {},
    }));
    const client = makeClient(f as unknown as typeof fetch);
    expect(await client.getSubstituteItems('ART1')).toEqual([]);
  });
});

describe('MyMbErpClient.getOrderRows', () => {
  it('calls GetRigheConInfoConsegna with Causale/Anno/Numero and returns the rows', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({
      GetRigheConInfoConsegnaResult: {
        ListaRigheConInfoConsegna: [
          { CodiceArticolo: 'CB1211-0WA.W42', DescrizioneArticolo: 'W /42 I-ROBOX TOP' },
        ],
      },
    }));
    const client = makeClient(f as unknown as typeof fetch);
    const rows = await client.getOrderRows({ cause: 'B05', year: '2026', number: '15199938' });
    expect(rows).toHaveLength(1);
    expect(rows[0].CodiceArticolo).toBe('CB1211-0WA.W42');
    expect(f).toHaveBeenCalledOnce();
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain('/GetRigheConInfoConsegna');
    expect(url).toContain('Causale=B05');
    expect(url).toContain('Anno=2026');
    expect(url).toContain('Numero=15199938');
    expect(url).toContain('TipoEstrazione=');
    expect((f.mock.calls[0][1] as RequestInit).method).toBe('GET');
  });

  it('returns [] when the result list is missing', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ GetRigheConInfoConsegnaResult: {} }));
    const client = makeClient(f as unknown as typeof fetch);
    expect(await client.getOrderRows({ cause: 'B05', year: 2026, number: 1 })).toEqual([]);
  });
});

describe('MyMbErpClient.getDocumentRows', () => {
  it('DDT → GetRigheDDTConInfo, returns ListaRigheDDTConInfo', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({
      GetRigheDDTConInfoResult: {
        ReturnCode: 0,
        ListaRigheDDTConInfo: [{ CodiceArticolo: '5010770', CodiceInternoArticolo: '525131', Quantita: 10 }],
      },
    }));
    const client = makeClient(f as unknown as typeof fetch);
    const rows = await client.getDocumentRows({ cause: 'F', year: 2026, number: 75208, docType: 'DDT' });
    expect(rows).toHaveLength(1);
    expect(rows[0].CodiceInternoArticolo).toBe('525131');
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain('/GetRigheDDTConInfo');
    expect(url).toContain('Causale=F');
    expect(url).toContain('Anno=2026');
    expect(url).toContain('Numero=75208');
  });

  it('F → GetRigheFATTConInfo (also ListaRigheDDTConInfo)', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({
      GetRigheFATTConInfoResult: { ReturnCode: 0, ListaRigheDDTConInfo: [{ CodiceArticolo: 'X' }] },
    }));
    const client = makeClient(f as unknown as typeof fetch);
    const rows = await client.getDocumentRows({ cause: 'V1', year: 2026, number: 9, docType: 'F' });
    expect(rows).toHaveLength(1);
    expect(String(f.mock.calls[0][0])).toContain('/GetRigheFATTConInfo');
  });

  it('returns [] when the list is missing', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ GetRigheDDTConInfoResult: { ReturnCode: 0 } }));
    const client = makeClient(f as unknown as typeof fetch);
    expect(await client.getDocumentRows({ cause: 'F', year: 2026, number: 1, docType: 'DDT' })).toEqual([]);
  });
});

describe('MyMbErpClient.getOrders', () => {
  it('passes an empty addressCode through as "" (all addresses), NOT "1"', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({
      GetTestateConInfoConsegnaResult: { ReturnCode: 0, ListaTestateConInfoConsegna: [{ NumeroDocDefinitivo: 21 }] },
    }));
    const client = makeClient(f as unknown as typeof fetch);
    const rows = await client.getOrders({ customerCode: 'B_850', addressCode: '', type: 'T' });
    expect(rows).toHaveLength(1);
    const url = String(f.mock.calls[0][0]);
    // Defaulting to "1" hid orders placed under other ship-to addresses.
    expect(url).toContain('CodiceIndirizzo=&'); // empty value, not "1"
    expect(url).not.toContain('CodiceIndirizzo=1');
    expect(url).toContain('TipoEstrazione=T');
  });

  it('forwards an explicit addressCode unchanged', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({
      GetTestateConInfoConsegnaResult: { ReturnCode: 0, ListaTestateConInfoConsegna: [] },
    }));
    const client = makeClient(f as unknown as typeof fetch);
    await client.getOrders({ customerCode: 'C', addressCode: '7', type: 'E' });
    expect(String(f.mock.calls[0][0])).toContain('CodiceIndirizzo=7');
  });
});
