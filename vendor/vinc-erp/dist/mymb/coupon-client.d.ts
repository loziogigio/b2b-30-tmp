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
        m_Item2?: {
            isValido?: string;
            Messaggio?: string;
            percentualeSconto?: string;
        };
    };
}
/** Lookup response from GetInfoCouponFromDocumento. */
export interface CartCouponInfo {
    GetInfoCouponFromDocumentoResult?: {
        m_Item2?: {
            Codice?: string;
        };
    };
}
/** Persistence response from UpdateTestataDocumentoConCoupon. */
export interface CouponPersistResult {
    UpdateTestataDocumentoConCouponResult?: {
        ReturnCode?: number;
    };
}
/** Thin proxy to the MyMB coupon webservices over a dedicated Basic-auth connection. */
export declare class CouponClient {
    private readonly baseUrl;
    private readonly authHeader;
    private readonly fetchImpl?;
    constructor(config: CouponClientConfig);
    private get;
    validateCoupon(cliente: string, coupon: string): Promise<CouponValidation>;
    getCartCoupon(idCart: string | number): Promise<CartCouponInfo>;
    submitCoupon(idElaborazione: string | number, coupon: string): Promise<CouponPersistResult>;
    verifyPromoItem(cliente: string, indirizzo: string, articolo: string): Promise<any>;
}
//# sourceMappingURL=coupon-client.d.ts.map