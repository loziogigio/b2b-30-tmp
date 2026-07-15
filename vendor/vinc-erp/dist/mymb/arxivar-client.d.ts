export interface ArxivarClientConfig {
    /** Base URL, no userinfo, no trailing slash (from parseMyMbConnection). */
    baseUrl: string;
    /** `Basic ...` header value. */
    authHeader: string;
    /** Inject for tests; defaults to global fetch. */
    fetchImpl?: typeof fetch;
}
/** GetInvoicesFromArxivarIX response shape (only the field we consume). */
export interface ArxivarInvoiceResult {
    GetInvoicesFromArxivarIXResult?: {
        Data?: Array<{
            Contenuto?: string;
        }>;
    };
}
export interface GetInvoicePdfInput {
    /** Document cause; fiscal invoices use 'VEN'. */
    cause?: string;
    year: string | number;
    number: string | number;
    docType?: string | number;
}
/** Thin proxy to MyMB's ArxivarIX document-archive webservice (its own connection). */
export declare class ArxivarClient {
    private readonly baseUrl;
    private readonly authHeader;
    private readonly fetchImpl?;
    constructor(config: ArxivarClientConfig);
    /** Fetch a fiscal document PDF; returns the base64 `Contenuto`. */
    getInvoicePdf(input: GetInvoicePdfInput): Promise<string>;
}
//# sourceMappingURL=arxivar-client.d.ts.map