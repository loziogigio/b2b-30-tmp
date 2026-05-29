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
