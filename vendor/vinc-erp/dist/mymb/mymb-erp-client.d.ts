import type { CacheAdapter } from '../cache.js';
import type { ErpClient } from '../erp-client.js';
import type { MyMbErpSettings, MyMbPriceEntry, PriceQuery } from '../types/pricing.js';
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
     * does NOT override it for type 'T'. Empty `addressCode` defaults to '1'.
     */
    getOrders(input: {
        customerCode: string;
        addressCode?: string;
        type?: string;
        dateFrom?: string;
        dateTo?: string;
        customerRef?: string;
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