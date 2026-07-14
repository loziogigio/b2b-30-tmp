import type { CacheAdapter } from '../cache.js';
import { NoopCacheAdapter } from '../cache.js';
import type { ErpClient } from '../erp-client.js';
import { ErpError } from '../erp-client.js';
import { MYMB_ENDPOINTS } from '../endpoints.js';
import type { MyMbErpSettings, MyMbPriceEntry, PriceQuery } from '../types/pricing.js';
import type { MyMbCartClosureInfo } from '../types/cart-closure.js';
import { buildCartClosureInfo } from '../types/cart-closure.js';
import { buildPriceEntry } from './transform.js';
import { mymbRequest } from './request.js';

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
    return mymbRequest<T>(this.baseUrl, this.authHeader, endpoint, {
      method: opts.method,
      params: opts.params,
      body: opts.body,
      fetchImpl: this.fetchImpl,
    });
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
   * does NOT override it for type 'T'. `addressCode` is passed as-is: empty
   * means ALL of the customer's ship-to addresses (do NOT default it to '1',
   * which restricts to a single address and hides orders placed under others
   * — verified against MyMB, matching getInvoices/getDdt).
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
      CodiceIndirizzo: input.addressCode ?? '',
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

  /**
   * Cart/order line rows — MyMB `GetRigheCarrello?IdCarrello=…` (GET). Each
   * order testata carries an `IDCarrello`; this returns that cart's
   * `ListaRighe` (the ordered line items). Used to build order detail, since
   * MyMB has no single-order detail endpoint.
   */
  async getCartRows(idCarrello: number | string): Promise<any[]> {
    const data = await this.request<any>(MYMB_ENDPOINTS.GET_RIGHE_CARRELLO, {
      method: 'GET',
      params: { IdCarrello: idCarrello },
    });
    return data?.GetRigheCarrelloResult?.ListaRighe ?? [];
  }

  /**
   * Order-header info for cart closure — MyMB
   * `GetInfoTestataOrdineXControlloChiusura?IdCarrello=…` (GET).
   *
   * This is the ONLY place the ERP exposes its minimum-order rule (IMPMIN):
   * it is an order-header rule, so it does not appear in GetPrezzaturaMultipla's
   * per-article promo rows. Mirrors the legacy
   * `looxb2b_ordine_minimo_spese_trasporto($id_carrello)`.
   *
   * NOTE: the ERP resolves the customer from the CART, so `idCarrello` must be a
   * real ERP cart. An unknown/empty id returns zeros (and `compliant: true`),
   * which callers must treat as "no minimum configured" rather than "compliant".
   */
  async getCartClosureInfo(
    idCarrello: number | string,
    opts: { applyTransportCosts?: boolean; shippingPromoCode?: string } = {},
  ): Promise<MyMbCartClosureInfo> {
    const data = await this.request<any>(
      MYMB_ENDPOINTS.GET_INFO_TESTATA_ORDINE_X_CONTROLLO_CHIUSURA,
      {
        method: 'GET',
        params: {
          IdCarrello: idCarrello,
          isApplicaSpeseDiTrasportoSePreviste:
            opts.applyTransportCosts ?? true,
          CodicePromozioneSpedizione: opts.shippingPromoCode ?? '',
        },
      },
    );

    const result = data?.GetInfoTestataOrdineXControlloChiusuraResult;
    if (!result || result.ReturnCode !== 0) {
      throw new ErpError(
        `GetInfoTestataOrdineXControlloChiusura error: ${result?.Message ?? 'unknown'}`,
        {
          endpoint: MYMB_ENDPOINTS.GET_INFO_TESTATA_ORDINE_X_CONTROLLO_CHIUSURA,
          returnCode: result?.ReturnCode,
        },
      );
    }
    return buildCartClosureInfo(result);
  }

  /**
   * Document line rows — MyMB `GetRigheConInfoConsegna?Causale&Anno&Numero`
   * (GET). Reads rows straight off the ERP document, so it also covers
   * historical orders that never went through a web cart (no IDCarrello —
   * where `getCartRows` comes back empty). `type` is MyMB's TipoEstrazione;
   * the ERP accepts it empty.
   */
  async getOrderRows(input: {
    cause: string;
    year: number | string;
    number: number | string;
    type?: string;
  }): Promise<any[]> {
    const data = await this.request<any>(
      MYMB_ENDPOINTS.GET_RIGHE_CON_INFO_CONSEGNA,
      {
        method: 'GET',
        params: {
          Causale: input.cause,
          Anno: input.year,
          Numero: input.number,
          TipoEstrazione: input.type ?? '',
        },
      },
    );
    return (
      data?.GetRigheConInfoConsegnaResult?.ListaRigheConInfoConsegna ?? []
    );
  }

  /**
   * Document line rows for an invoice (F) or DDT — MyMB
   * `GetRigheFATTConInfo` / `GetRigheDDTConInfo?Causale&Anno&Numero` (GET).
   * Both wrap the rows in `…Result.ListaRigheDDTConInfo`. Used to build the
   * per-line barcode/CSV export for the direct-MyMB (time) documents page,
   * which has no legacy hub. Row shape matches getOrderRows (captured live).
   */
  async getDocumentRows(input: {
    cause: string;
    year: number | string;
    number: number | string;
    docType: 'F' | 'DDT';
    type?: string;
  }): Promise<any[]> {
    const endpoint =
      input.docType === 'DDT'
        ? MYMB_ENDPOINTS.GET_RIGHE_DDT_CON_INFO
        : MYMB_ENDPOINTS.GET_RIGHE_FATT_CON_INFO;
    const data = await this.request<any>(endpoint, {
      method: 'GET',
      params: {
        Causale: input.cause,
        Anno: input.year,
        Numero: input.number,
        TipoEstrazione: input.type ?? '',
      },
    });
    const resultKey =
      input.docType === 'DDT'
        ? 'GetRigheDDTConInfoResult'
        : 'GetRigheFATTConInfoResult';
    return data?.[resultKey]?.ListaRigheDDTConInfo ?? [];
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
