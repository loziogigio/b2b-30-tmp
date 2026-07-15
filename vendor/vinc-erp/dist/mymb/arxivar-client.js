"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArxivarClient = void 0;
const endpoints_js_1 = require("../endpoints.js");
const erp_client_js_1 = require("../erp-client.js");
const request_js_1 = require("./request.js");
/** Thin proxy to MyMB's ArxivarIX document-archive webservice (its own connection). */
class ArxivarClient {
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.authHeader = config.authHeader;
        this.fetchImpl = config.fetchImpl;
    }
    /** Fetch a fiscal document PDF; returns the base64 `Contenuto`. */
    async getInvoicePdf(input) {
        const res = await (0, request_js_1.mymbRequest)(this.baseUrl, this.authHeader, endpoints_js_1.ARXIVAR_ENDPOINTS.GET_INVOICES_FROM_ARXIVARIX, {
            method: 'GET',
            params: {
                Causale: input.cause ?? 'VEN',
                Anno: input.year,
                Numero: input.number,
                TipoDocumento: input.docType,
            },
            fetchImpl: this.fetchImpl,
        });
        const contenuto = res?.GetInvoicesFromArxivarIXResult?.Data?.[0]?.Contenuto;
        if (!contenuto) {
            throw new erp_client_js_1.ErpError('ArxivarIX returned no document content', {
                endpoint: endpoints_js_1.ARXIVAR_ENDPOINTS.GET_INVOICES_FROM_ARXIVARIX,
            });
        }
        return contenuto;
    }
}
exports.ArxivarClient = ArxivarClient;
//# sourceMappingURL=arxivar-client.js.map