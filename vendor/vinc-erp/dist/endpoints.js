"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MYMB_COUPON_ENDPOINTS = exports.MYMB_ENDPOINTS = void 0;
/** Raw MYMB ERP webservice endpoints (PascalCase, appended to the base URL). */
exports.MYMB_ENDPOINTS = {
    GET_PREZZATURA_MULTIPLA: 'GetPrezzaturaMultipla',
    GET_LISTA_ARTICOLI_ALTERNATIVI: 'GetListaArticoliAlternativi',
    GET_TESTATE_CON_INFO_CONSEGNA: 'GetTestateConInfoConsegna',
    GET_CLIENTE: 'GetCliente',
    GET_ESPOSIZIONE_CLIENTE_INFO: 'GetEsposizioneClienteInfo',
    GET_LISTA_SCADENZE_CON_INFO: 'GetListaScadenzeConInfo',
    GET_TESTATE_FATT_CON_INFO: 'GetTestateFATTConInfo',
    GET_TESTATE_DDT_CON_INFO: 'GetTestateDDTConInfo',
};
/** Raw MYMB coupon webservice endpoints (separate connection from pricing). */
exports.MYMB_COUPON_ENDPOINTS = {
    GET_STATO_COUPON_CLIENTE: 'GetStatoCouponCliente',
    GET_INFO_COUPON_FROM_DOCUMENTO: 'GetInfoCouponFromDocumento',
    UPDATE_TESTATA_DOCUMENTO_CON_COUPON: 'UpdateTestataDocumentoConCoupon',
    GET_PROMOZIONE_BASE_X_ARTICOLO: 'GetPromozioneBaseXArticolo',
};
//# sourceMappingURL=endpoints.js.map