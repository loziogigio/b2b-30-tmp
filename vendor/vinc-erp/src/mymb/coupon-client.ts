import { MYMB_COUPON_ENDPOINTS } from '../endpoints.js';
import { mymbRequest } from './request.js';

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

  verifyPromoItem(cliente: string, indirizzo: string, articolo: string): Promise<any> {
    return this.get(MYMB_COUPON_ENDPOINTS.GET_PROMOZIONE_BASE_X_ARTICOLO, {
      codiceInternoCliente: cliente, codiceIndirizzo: indirizzo, codiceInternoArticolo: articolo,
    });
  }
}
