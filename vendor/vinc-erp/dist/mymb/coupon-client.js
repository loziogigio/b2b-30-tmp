"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponClient = void 0;
const endpoints_js_1 = require("../endpoints.js");
const request_js_1 = require("./request.js");
/**
 * Date format GetPromozioneBaseXArticolo's DateTime.ParseExact expects: dd/MM/yyyy
 * (with slashes). NOTE this differs from GetPrezzaturaMultipla, which wants
 * DDMMYYYY with no separators — verified empirically against the live service:
 * "12062026"/"2026-06-12" → FormatException, "12/06/2026" → accepted.
 */
function ddMMyyyySlash(d = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
/** Thin proxy to the MyMB coupon webservices over a dedicated Basic-auth connection. */
class CouponClient {
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.authHeader = config.authHeader;
        this.fetchImpl = config.fetchImpl;
    }
    get(endpoint, params) {
        return (0, request_js_1.mymbRequest)(this.baseUrl, this.authHeader, endpoint, {
            method: 'GET', params, fetchImpl: this.fetchImpl,
        });
    }
    validateCoupon(cliente, coupon) {
        return this.get(endpoints_js_1.MYMB_COUPON_ENDPOINTS.GET_STATO_COUPON_CLIENTE, {
            codiceInternoCliente: cliente, codiceCoupon: coupon,
        });
    }
    getCartCoupon(idCart) {
        return this.get(endpoints_js_1.MYMB_COUPON_ENDPOINTS.GET_INFO_COUPON_FROM_DOCUMENTO, {
            idElaborazione: idCart,
        });
    }
    submitCoupon(idElaborazione, coupon) {
        return this.get(endpoints_js_1.MYMB_COUPON_ENDPOINTS.UPDATE_TESTATA_DOCUMENTO_CON_COUPON, {
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
    verifyPromoItem(cliente, indirizzo, articolo, dataPrezzatura = ddMMyyyySlash(), valuta = 'EUR') {
        return this.get(endpoints_js_1.MYMB_COUPON_ENDPOINTS.GET_PROMOZIONE_BASE_X_ARTICOLO, {
            codiceInternoCliente: cliente,
            codiceIndirizzo: indirizzo,
            dataPrezzatura,
            valuta,
            codiceInternoArticolo: articolo,
        });
    }
}
exports.CouponClient = CouponClient;
//# sourceMappingURL=coupon-client.js.map