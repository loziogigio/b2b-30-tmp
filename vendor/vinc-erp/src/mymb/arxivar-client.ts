import { ARXIVAR_ENDPOINTS } from '../endpoints.js';
import { mymbRequest } from './request.js';

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
    Data?: Array<{ Contenuto?: string }>;
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
export class ArxivarClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(config: ArxivarClientConfig) {
    this.baseUrl = config.baseUrl;
    this.authHeader = config.authHeader;
    this.fetchImpl = config.fetchImpl;
  }

  /**
   * Fetch a fiscal document PDF; returns the base64 `Contenuto`, or `null` when
   * the archive has no PDF for this document (a valid 200 with empty `Data`).
   * Transport/HTTP errors still throw (via `mymbRequest`), so callers can tell
   * "not archived" (null) apart from "archive unreachable" (throw).
   */
  async getInvoicePdf(input: GetInvoicePdfInput): Promise<string | null> {
    const res = await mymbRequest<ArxivarInvoiceResult>(
      this.baseUrl,
      this.authHeader,
      ARXIVAR_ENDPOINTS.GET_INVOICES_FROM_ARXIVARIX,
      {
        method: 'GET',
        params: {
          Causale: input.cause ?? 'VEN',
          Anno: input.year,
          Numero: input.number,
          TipoDocumento: input.docType,
        },
        fetchImpl: this.fetchImpl,
      },
    );
    return res?.GetInvoicesFromArxivarIXResult?.Data?.[0]?.Contenuto ?? null;
  }
}
