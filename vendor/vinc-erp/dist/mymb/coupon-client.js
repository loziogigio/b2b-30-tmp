"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponClient = void 0;
const endpoints_js_1 = require("../endpoints.js");
const request_js_1 = require("./request.js");
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
    verifyPromoItem(cliente, indirizzo, articolo) {
        return this.get(endpoints_js_1.MYMB_COUPON_ENDPOINTS.GET_PROMOZIONE_BASE_X_ARTICOLO, {
            codiceInternoCliente: cliente, codiceIndirizzo: indirizzo, codiceInternoArticolo: articolo,
        });
    }
}
exports.CouponClient = CouponClient;
//# sourceMappingURL=coupon-client.js.map