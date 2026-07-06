"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyMbErpClient = void 0;
const cache_js_1 = require("../cache.js");
const erp_client_js_1 = require("../erp-client.js");
const endpoints_js_1 = require("../endpoints.js");
const transform_js_1 = require("./transform.js");
const request_js_1 = require("./request.js");
function ddmmyyyy(d = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}${p(d.getMonth() + 1)}${d.getFullYear()}`;
}
class MyMbErpClient {
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.authHeader = config.authHeader;
        this.settings = config.settings;
        this.cache = config.cache ?? new cache_js_1.NoopCacheAdapter();
        this.fetchImpl = config.fetchImpl ?? fetch;
    }
    /** Mirrors Python ErpClient.request: Basic auth, ReturnCode handling, errors. */
    async request(endpoint, opts = {}) {
        return (0, request_js_1.mymbRequest)(this.baseUrl, this.authHeader, endpoint, {
            method: opts.method,
            params: opts.params,
            body: opts.body,
            fetchImpl: this.fetchImpl,
        });
    }
    async getSubstituteItems(entityCode, idCart = 0, pricingDate = ddmmyyyy()) {
        const data = await this.request(endpoints_js_1.MYMB_ENDPOINTS.GET_LISTA_ARTICOLI_ALTERNATIVI, {
            method: 'GET',
            params: { CodiceInternoArticolo: entityCode, IdElaborazione: idCart, DataPrezzatura: pricingDate },
        });
        const list = data?.GetListaArticoliAlternativiResult?.ListaPrezzatura ?? [];
        return Array.isArray(list) ? list.map((it) => it?.CodiceInternoArticolo) : [];
    }
    async getMultiplePrices(input) {
        const entityCodes = input.entityCodes ?? [];
        if (entityCodes.length === 0)
            return {};
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
        const data = await this.request(endpoints_js_1.MYMB_ENDPOINTS.GET_PREZZATURA_MULTIPLA, { method: 'POST', body });
        const result = data?.GetPrezzaturaMultiplaResult;
        if (!result || result.ReturnCode !== 0) {
            throw new erp_client_js_1.ErpError(`GetPrezzaturaMultipla error: ${result?.Message ?? 'unknown'}`, {
                endpoint: endpoints_js_1.MYMB_ENDPOINTS.GET_PREZZATURA_MULTIPLA,
                returnCode: result?.ReturnCode,
            });
        }
        const out = {};
        for (const price of result.ListaPrezzatura ?? []) {
            const entry = (0, transform_js_1.buildPriceEntry)(price, this.settings);
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
    async getOrders(input) {
        const params = {
            CodiceInternoCliente: input.customerCode,
            TipoEstrazione: input.type || 'E',
            CodiceIndirizzo: input.addressCode ?? '',
            IdRiferimentoCliente: input.customerRef && input.customerRef !== '0' ? input.customerRef : 0,
        };
        if (input.dateFrom && input.dateTo) {
            params.DataRegistrazioneIniziale = input.dateFrom;
            params.DataRegistrazioneFinale = input.dateTo;
        }
        const data = await this.request(endpoints_js_1.MYMB_ENDPOINTS.GET_TESTATE_CON_INFO_CONSEGNA, { method: 'GET', params });
        return data?.GetTestateConInfoConsegnaResult?.ListaTestateConInfoConsegna ?? [];
    }
    /**
     * Cart/order line rows — MyMB `GetRigheCarrello?IdCarrello=…` (GET). Each
     * order testata carries an `IDCarrello`; this returns that cart's
     * `ListaRighe` (the ordered line items). Used to build order detail, since
     * MyMB has no single-order detail endpoint.
     */
    async getCartRows(idCarrello) {
        const data = await this.request(endpoints_js_1.MYMB_ENDPOINTS.GET_RIGHE_CARRELLO, {
            method: 'GET',
            params: { IdCarrello: idCarrello },
        });
        return data?.GetRigheCarrelloResult?.ListaRighe ?? [];
    }
    /**
     * Document line rows — MyMB `GetRigheConInfoConsegna?Causale&Anno&Numero`
     * (GET). Reads rows straight off the ERP document, so it also covers
     * historical orders that never went through a web cart (no IDCarrello —
     * where `getCartRows` comes back empty). `type` is MyMB's TipoEstrazione;
     * the ERP accepts it empty.
     */
    async getOrderRows(input) {
        const data = await this.request(endpoints_js_1.MYMB_ENDPOINTS.GET_RIGHE_CON_INFO_CONSEGNA, {
            method: 'GET',
            params: {
                Causale: input.cause,
                Anno: input.year,
                Numero: input.number,
                TipoEstrazione: input.type ?? '',
            },
        });
        return (data?.GetRigheConInfoConsegnaResult?.ListaRigheConInfoConsegna ?? []);
    }
    /**
     * Document line rows for an invoice (F) or DDT — MyMB
     * `GetRigheFATTConInfo` / `GetRigheDDTConInfo?Causale&Anno&Numero` (GET).
     * Both wrap the rows in `…Result.ListaRigheDDTConInfo`. Used to build the
     * per-line barcode/CSV export for the direct-MyMB (time) documents page,
     * which has no legacy hub. Row shape matches getOrderRows (captured live).
     */
    async getDocumentRows(input) {
        const endpoint = input.docType === 'DDT'
            ? endpoints_js_1.MYMB_ENDPOINTS.GET_RIGHE_DDT_CON_INFO
            : endpoints_js_1.MYMB_ENDPOINTS.GET_RIGHE_FATT_CON_INFO;
        const data = await this.request(endpoint, {
            method: 'GET',
            params: {
                Causale: input.cause,
                Anno: input.year,
                Numero: input.number,
                TipoEstrazione: input.type ?? '',
            },
        });
        const resultKey = input.docType === 'DDT'
            ? 'GetRigheDDTConInfoResult'
            : 'GetRigheFATTConInfoResult';
        return data?.[resultKey]?.ListaRigheDDTConInfo ?? [];
    }
    /** Customer profile — hub `get_client` → MyMB `GetCliente` (GET). */
    async getCustomer(customerCode) {
        const data = await this.request(endpoints_js_1.MYMB_ENDPOINTS.GET_CLIENTE, {
            method: 'GET',
            params: { CodiceInternoCliente: customerCode },
        });
        return data?.GetClienteResult ?? null;
    }
    /** Credit exposure — hub `exposition` → MyMB `GetEsposizioneClienteInfo` (GET). */
    async getExposition(customerCode) {
        const data = await this.request(endpoints_js_1.MYMB_ENDPOINTS.GET_ESPOSIZIONE_CLIENTE_INFO, {
            method: 'GET',
            params: { CodiceInternoCliente: customerCode },
        });
        return data?.GetEsposizioneClienteInfoResult ?? null;
    }
    /** Payment deadlines — hub `payment_deadline` → MyMB `GetListaScadenzeConInfo` (GET). */
    async getPaymentDeadline(customerCode) {
        const data = await this.request(endpoints_js_1.MYMB_ENDPOINTS.GET_LISTA_SCADENZE_CON_INFO, {
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
    enrichDocRows(rows, docType) {
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
    async getInvoices(input) {
        const data = await this.request(endpoints_js_1.MYMB_ENDPOINTS.GET_TESTATE_FATT_CON_INFO, {
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
    async getDdt(input) {
        const data = await this.request(endpoints_js_1.MYMB_ENDPOINTS.GET_TESTATE_DDT_CON_INFO, {
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
exports.MyMbErpClient = MyMbErpClient;
//# sourceMappingURL=mymb-erp-client.js.map