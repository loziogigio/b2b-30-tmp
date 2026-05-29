import type { CacheAdapter } from '../cache.js';
import { NoopCacheAdapter } from '../cache.js';
import type { ErpClient } from '../erp-client.js';
import { ErpError } from '../erp-client.js';
import { MYMB_ENDPOINTS } from '../endpoints.js';
import type { MyMbErpSettings, MyMbPriceEntry, PriceQuery } from '../types/pricing.js';
import { buildPriceEntry } from './transform.js';

export interface MyMbErpClientConfig {
  /** Base URL, no userinfo, no trailing slash (from parseMyMbConnection). */
  baseUrl: string;
  /** `Basic ...` header value (from parseMyMbConnection). */
  authHeader: string;
  settings: MyMbErpSettings;
  cache?: CacheAdapter;
  /** Inject for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

function ddmmyyyy(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}${p(d.getMonth() + 1)}${d.getFullYear()}`;
}

export class MyMbErpClient implements ErpClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly settings: MyMbErpSettings;
  private readonly cache: CacheAdapter;
  private readonly fetchImpl: typeof fetch;

  constructor(config: MyMbErpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.authHeader = config.authHeader;
    this.settings = config.settings;
    this.cache = config.cache ?? new NoopCacheAdapter();
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  /** Mirrors Python ErpClient.request: Basic auth, ReturnCode handling, errors. */
  private async request<T = any>(
    endpoint: string,
    opts: { method?: 'GET' | 'POST'; params?: Record<string, unknown>; body?: unknown } = {},
  ): Promise<T> {
    const method = opts.method ?? 'POST';
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    if (opts.params) {
      for (const [k, v] of Object.entries(opts.params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    let res: Response;
    try {
      res = await this.fetchImpl(url.toString(), {
        method,
        headers: {
          Authorization: this.authHeader,
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

  async getSubstituteItems(
    entityCode: string,
    idCart = 0,
    pricingDate: string = ddmmyyyy(),
  ): Promise<string[]> {
    const data = await this.request<any>(MYMB_ENDPOINTS.GET_LISTA_ARTICOLI_ALTERNATIVI, {
      method: 'GET',
      params: { CodiceInternoArticolo: entityCode, IdElaborazione: idCart, DataPrezzatura: pricingDate },
    });
    const list = data?.GetListaArticoliAlternativiResult?.ListaPrezzatura ?? [];
    return Array.isArray(list) ? list.map((it: any) => it?.CodiceInternoArticolo) : [];
  }

  async getMultiplePrices(input: PriceQuery): Promise<Record<string, MyMbPriceEntry>> {
    const entityCodes = input.entityCodes ?? [];
    if (entityCodes.length === 0) return {};

    const pricingDate = input.pricingDate ?? ddmmyyyy();
    const body = {
      CodiceInternoCliente: input.customerCode,
      CodiceIndirizzo: input.addressCode,
      ListaCodiciInterniArticolo: entityCodes,
      DataPrezzatura: pricingDate,
      isCaricaListaImballi: input.loadPackingList ?? true,
      isCalcolaDisponibilita: input.calculateAvailability ?? true,
      isCalcolaArrivi: input.calculateArrivals ?? true,
      isCalcolaOrdinatoInPrecedenza: input.calculatePreviousOrders ?? true,
      IdElaborazione: input.idCart ?? '0',
      ListaQuantita: input.quantityList ?? new Array(entityCodes.length).fill(1),
    };

    const data = await this.request<any>(MYMB_ENDPOINTS.GET_PREZZATURA_MULTIPLA, { method: 'POST', body });
    const result = data?.GetPrezzaturaMultiplaResult;
    if (!result || result.ReturnCode !== 0) {
      throw new ErpError(`GetPrezzaturaMultipla error: ${result?.Message ?? 'unknown'}`, {
        endpoint: MYMB_ENDPOINTS.GET_PREZZATURA_MULTIPLA,
        returnCode: result?.ReturnCode,
      });
    }

    const out: Record<string, MyMbPriceEntry> = {};
    for (const price of result.ListaPrezzatura ?? []) {
      const entry = buildPriceEntry(price, this.settings);
      const label = entry.product_label_action;
      // Substitute fallback — Python: when nothing available and subs are managed.
      if ((label.quantity_available ?? 0) <= 0 && label.is_managed_substitutes) {
        const subs = await this.getSubstituteItems(entry.entity_code);
        label.prod_substitution = subs;
        entry.prod_substitution = subs;
      }
      out[entry.entity_code] = entry;
    }
    return out;
  }

  /**
   * Order history — mirrors the legacy hub `get_orders` → MyMB
   * `GetTestateConInfoConsegna` (GET). Returns the raw
   * `ListaTestateConInfoConsegna` array (order headers with delivery info).
   *
   * `type` is MyMB's TipoEstrazione (default 'E'; 'T' = open orders). The
   * requested registration-date range is passed straight through — the hub
   * does NOT override it for type 'T'. Empty `addressCode` defaults to '1'.
   */
  async getOrders(input: {
    customerCode: string;
    addressCode?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    customerRef?: string;
  }): Promise<any[]> {
    const params: Record<string, unknown> = {
      CodiceInternoCliente: input.customerCode,
      TipoEstrazione: input.type || 'E',
      CodiceIndirizzo: input.addressCode || '1',
      IdRiferimentoCliente:
        input.customerRef && input.customerRef !== '0' ? input.customerRef : 0,
    };
    if (input.dateFrom && input.dateTo) {
      params.DataRegistrazioneIniziale = input.dateFrom;
      params.DataRegistrazioneFinale = input.dateTo;
    }
    const data = await this.request<any>(
      MYMB_ENDPOINTS.GET_TESTATE_CON_INFO_CONSEGNA,
      { method: 'GET', params },
    );
    return data?.GetTestateConInfoConsegnaResult?.ListaTestateConInfoConsegna ?? [];
  }

  /** Customer profile — hub `get_client` → MyMB `GetCliente` (GET). */
  async getCustomer(customerCode: string): Promise<any> {
    const data = await this.request<any>(MYMB_ENDPOINTS.GET_CLIENTE, {
      method: 'GET',
      params: { CodiceInternoCliente: customerCode },
    });
    return data?.GetClienteResult ?? null;
  }

  /** Credit exposure — hub `exposition` → MyMB `GetEsposizioneClienteInfo` (GET). */
  async getExposition(customerCode: string): Promise<any> {
    const data = await this.request<any>(MYMB_ENDPOINTS.GET_ESPOSIZIONE_CLIENTE_INFO, {
      method: 'GET',
      params: { CodiceInternoCliente: customerCode },
    });
    return data?.GetEsposizioneClienteInfoResult ?? null;
  }

  /** Payment deadlines — hub `payment_deadline` → MyMB `GetListaScadenzeConInfo` (GET). */
  async getPaymentDeadline(customerCode: string): Promise<any> {
    const data = await this.request<any>(MYMB_ENDPOINTS.GET_LISTA_SCADENZE_CON_INFO, {
      method: 'GET',
      params: { CodiceInternoCliente: customerCode },
    });
    return data?.GetListaScadenzeConInfoResult ?? null;
  }

  /**
   * Enrich MyMB document-header rows (ListaTestateDDTFATTConInfo) with the
   * derived fields the frontend expects — a port of the per-row mapping the
   * legacy hub did for `get_invoices` / `get_ddt`. `docType` drives the
   * frontend's tab + DDT-only-barcode guardrail; `I`/`D` is the barcode kind.
   */
  private enrichDocRows(rows: any[], docType: 'F' | 'DDT'): any[] {
    const typeBarCode = docType === 'DDT' ? 'D' : 'I';
    return (rows ?? []).map((v) => ({
      ...v,
      destination: v.DescrizioneEstesaIndirizzo,
      date: v.DataRegistrazione,
      document: `${v.CausaleDocDefinitivo}/${v.AnnoDocDefinitivo}/${v.NumeroDocDefinitivo}`,
      doc_type: docType,
      invoice_number: v.NumeroDocDefinitivo,
      taxable: v.TotaliDocumento?.[0],
      total: v.TotaliDocumento?.[2],
      scope: v.CausaleDocDefinitivo,
      year: v.AnnoDocDefinitivo,
      number: v.NumeroDocDefinitivo,
      type: docType === 'DDT' ? 'D' : v.TipoDocumento,
      type_bar_code: typeBarCode,
      bar_code_request: `${v.CausaleDocDefinitivo}/${v.AnnoDocDefinitivo}/${v.NumeroDocDefinitivo}/D`,
    }));
  }

  /** Invoices — hub `get_invoices` → MyMB `GetTestateFATTConInfo` (GET). */
  async getInvoices(input: {
    customerCode: string;
    addressCode?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any[]> {
    const data = await this.request<any>(MYMB_ENDPOINTS.GET_TESTATE_FATT_CON_INFO, {
      method: 'GET',
      params: {
        CodiceInternoCliente: input.customerCode,
        DataRegistrazioneIniziale: input.dateFrom,
        DataRegistrazioneFinale: input.dateTo,
        TipoEstrazione: input.type ?? '',
        CodiceIndirizzo: input.addressCode ?? '',
      },
    });
    const list = data?.GetTestateFATTConInfoResult?.ListaTestateDDTFATTConInfo ?? [];
    return this.enrichDocRows(list, 'F');
  }

  /** Delivery notes — hub `get_ddt` → MyMB `GetTestateDDTConInfo` (GET). */
  async getDdt(input: {
    customerCode: string;
    addressCode?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any[]> {
    const data = await this.request<any>(MYMB_ENDPOINTS.GET_TESTATE_DDT_CON_INFO, {
      method: 'GET',
      params: {
        CodiceInternoCliente: input.customerCode,
        DataRegistrazioneIniziale: input.dateFrom,
        DataRegistrazioneFinale: input.dateTo,
        TipoEstrazione: input.type ?? 'C',
        CodiceIndirizzo: input.addressCode ?? '',
      },
    });
    const list = data?.GetTestateDDTConInfoResult?.ListaTestateDDTFATTConInfo ?? [];
    return this.enrichDocRows(list, 'DDT');
  }
}
