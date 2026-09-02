import type { CacheAdapter } from '../cache.js';
import type { ErpClient } from '../erp-client.js';
import type { MyMbErpSettings, MyMbPriceEntry, PriceQuery } from '../types/pricing.js';
import type { MyMbCartClosureInfo } from '../types/cart-closure.js';
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
export declare class MyMbErpClient implements ErpClient {
    private readonly baseUrl;
    private readonly authHeader;
    private readonly settings;
    private readonly cache;
    private readonly fetchImpl;
    constructor(config: MyMbErpClientConfig);
    /** Mirrors Python ErpClient.request: Basic auth, ReturnCode handling, errors. */
    private request;
    getSubstituteItems(entityCode: string, idCart?: number, pricingDate?: string): Promise<string[]>;
    getMultiplePrices(input: PriceQuery): Promise<Record<string, MyMbPriceEntry>>;
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
    getOrders(input: {
        customerCode: string;
        addressCode?: string;
        type?: string;
        dateFrom?: string;
        dateTo?: string;
        customerRef?: string;
    }): Promise<any[]>;
    /**
     * Cart/order line rows — MyMB `GetRigheCarrello?IdCarrello=…` (GET). Each
     * order testata carries an `IDCarrello`; this returns that cart's
     * `ListaRighe` (the ordered line items). Used to build order detail, since
     * MyMB has no single-order detail endpoint.
     */
    getCartRows(idCarrello: number | string): Promise<any[]>;
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
    getCartClosureInfo(idCarrello: number | string, opts?: {
        applyTransportCosts?: boolean;
        shippingPromoCode?: string;
    }): Promise<MyMbCartClosureInfo>;
    /**
     * Document line rows — MyMB `GetRigheConInfoConsegna?Causale&Anno&Numero`
     * (GET). Reads rows straight off the ERP document, so it also covers
     * historical orders that never went through a web cart (no IDCarrello —
     * where `getCartRows` comes back empty). `type` is MyMB's TipoEstrazione;
     * the ERP accepts it empty.
     */
    getOrderRows(input: {
        cause: string;
        year: number | string;
        number: number | string;
        type?: string;
    }): Promise<any[]>;
    /**
     * Document line rows for an invoice (F) or DDT — MyMB
     * `GetRigheFATTConInfo` / `GetRigheDDTConInfo?Causale&Anno&Numero` (GET).
     * Both wrap the rows in `…Result.ListaRigheDDTConInfo`. Used to build the
     * per-line barcode/CSV export for the direct-MyMB (time) documents page,
     * which has no legacy hub. Row shape matches getOrderRows (captured live).
     */
    getDocumentRows(input: {
        cause: string;
        year: number | string;
        number: number | string;
        docType: 'F' | 'DDT';
        type?: string;
    }): Promise<any[]>;
    /**
     * This customer's order history for ONE article — MyMB
     * `GetUltimoOrdinatoClienteXArticolo` (GET). Backs the "già ordinato" popup.
     *
     * `entityCode` is the `CodiceInternoArticolo` (the PIM entity code, e.g.
     * "53295" for SKU BF05003), and `customerCode` the customer's
     * `CodiceInterno` — NOT the commercial `Codice`. Passing the commercial code
     * returns an empty list with no error, so a mismatch looks exactly like
     * "never ordered".
     *
     * Live shape captured from a tenant instance (customer 5300 ×
     * article 53295, 2026-09-02):
     *
     * ```jsonc
     * { "GetUltimoOrdinatoClienteXArticoloResult": {
     *     "m_Item1": { "Message": "", "ReturnCode": 0 },
     *     "m_Item2": [{
     *       "DataDecorrenza": "01/01/2024",
     *       "DataRegistrazioneString": "31/07/2026",
     *       "PkRiga": { "CausaleDocumento": "OC", "AnnoDocumento": 2026,
     *                   "NumeroDocumento": 1110, "NumeroRiga": 160 },
     *       "QuantitaOrdinata": 48, "QuantitaSaldata": 0,
     *       "QuantitaConsegnata": 48, "QuantitaResidua": 0,
     *       "PrezzaturaImputata_Prezzo": 1.52, "UM": null }] } }
     * ```
     *
     * Rows come back newest-document-first. Unlike `GetCliente`, this endpoint
     * never reports `ReturnCode 1`: an unknown article, an unknown customer,
     * empty params and even a request with no params at all all answer
     * `ReturnCode 0` with an empty `m_Item2`. There is therefore no error to
     * detect here — only "no history". POST is rejected by the service with a
     * 404 HTML page, so this must stay a GET.
     */
    getLatestOrderByItem(input: {
        customerCode: string;
        entityCode: string;
    }): Promise<any[]>;
    /** Customer profile — hub `get_client` → MyMB `GetCliente` (GET). */
    getCustomer(customerCode: string): Promise<any>;
    /** Credit exposure — hub `exposition` → MyMB `GetEsposizioneClienteInfo` (GET). */
    getExposition(customerCode: string): Promise<any>;
    /** Payment deadlines — hub `payment_deadline` → MyMB `GetListaScadenzeConInfo` (GET). */
    getPaymentDeadline(customerCode: string): Promise<any>;
    /**
     * Enrich MyMB document-header rows (ListaTestateDDTFATTConInfo) with the
     * derived fields the frontend expects — a port of the per-row mapping the
     * legacy hub did for `get_invoices` / `get_ddt`. `docType` drives the
     * frontend's tab + DDT-only-barcode guardrail; `I`/`D` is the barcode kind.
     */
    private enrichDocRows;
    /** Invoices — hub `get_invoices` → MyMB `GetTestateFATTConInfo` (GET). */
    getInvoices(input: {
        customerCode: string;
        addressCode?: string;
        type?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<any[]>;
    /** Delivery notes — hub `get_ddt` → MyMB `GetTestateDDTConInfo` (GET). */
    getDdt(input: {
        customerCode: string;
        addressCode?: string;
        type?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<any[]>;
}
//# sourceMappingURL=mymb-erp-client.d.ts.map