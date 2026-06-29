import { MYMB_COUPON_ENDPOINTS } from '../endpoints.js';
import { mymbRequest } from './request.js';

/**
 * Date format GetPromozioneBaseXArticolo's DateTime.ParseExact expects: dd/MM/yyyy
 * (with slashes). NOTE this differs from GetPrezzaturaMultipla, which wants
 * DDMMYYYY with no separators — verified empirically against the live service:
 * "12062026"/"2026-06-12" → FormatException, "12/06/2026" → accepted.
 */
function ddMMyyyySlash(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export interface CouponClientConfig {
  /** Base URL, no userinfo, no trailing slash (from parseMyMbConnection). */
  baseUrl: string;
  /** `Basic ...` header value. */
  authHeader: string;
  /** Inject for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/** Validation response from GetStatoCouponCliente. */
export interface CouponValidation {
  GetStatoCouponClienteResult?: {
    m_Item2?: { isValido?: string; Messaggio?: string; percentualeSconto?: string };
  };
}
/** Lookup response from GetInfoCouponFromDocumento. */
export interface CartCouponInfo {
  GetInfoCouponFromDocumentoResult?: { m_Item2?: { Codice?: string } };
}
/** Persistence response from UpdateTestataDocumentoConCoupon. */
export interface CouponPersistResult {
  UpdateTestataDocumentoConCouponResult?: { ReturnCode?: number };
}

/** Thin proxy to the MyMB coupon webservices over a dedicated Basic-auth connection. */
export class CouponClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(config: CouponClientConfig) {
    this.baseUrl = config.baseUrl;
    this.authHeader = config.authHeader;
    this.fetchImpl = config.fetchImpl;
  }

  private get(endpoint: string, params: Record<string, unknown>) {
    return mymbRequest<any>(this.baseUrl, this.authHeader, endpoint, {
      method: 'GET', params, fetchImpl: this.fetchImpl,
    });
  }

  validateCoupon(cliente: string, coupon: string): Promise<CouponValidation> {
    return this.get(MYMB_COUPON_ENDPOINTS.GET_STATO_COUPON_CLIENTE, {
      codiceInternoCliente: cliente, codiceCoupon: coupon,
    });
  }

  getCartCoupon(idCart: string | number): Promise<CartCouponInfo> {
    return this.get(MYMB_COUPON_ENDPOINTS.GET_INFO_COUPON_FROM_DOCUMENTO, {
      idElaborazione: idCart,
    });
  }

  submitCoupon(idElaborazione: string | number, coupon: string): Promise<CouponPersistResult> {
    return this.get(MYMB_COUPON_ENDPOINTS.UPDATE_TESTATA_DOCUMENTO_CON_COUPON, {
      idElaborazione, codiceCoupon: coupon,
    });
  }

  /**
   * GetPromozioneBaseXArticolo(ambiente, codiceInternoCliente, codiceIndirizzo,
   * dataPrezzatura, valuta, codiceInternoArticolo). `dataPrezzatura` and `valuta`
   * are REQUIRED by MyMB — the service does DateTime.ParseExact(dataPrezzatura,
   * "dd/MM/yyyy"): a missing value throws ArgumentNullException, a wrong format
   * throws FormatException (both surface as ReturnCode 99). `articolo` must be the
   * NUMERIC internal article code (CodiceInternoArticolo) — passing the SKU
   * triggers ORA-06502 (Oracle TO_NUMBER). Defaults: today (dd/MM/yyyy) and EUR.
   */
  verifyPromoItem(
    cliente: string,
    indirizzo: string,
    articolo: string,
    dataPrezzatura: string = ddMMyyyySlash(),
    valuta: string = 'EUR',
  ): Promise<any> {
    return this.get(MYMB_COUPON_ENDPOINTS.GET_PROMOZIONE_BASE_X_ARTICOLO, {
      codiceInternoCliente: cliente,
      codiceIndirizzo: indirizzo,
      dataPrezzatura,
      valuta,
      codiceInternoArticolo: articolo,
    });
  }
}
