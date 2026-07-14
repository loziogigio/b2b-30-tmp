/** Raw MYMB ERP webservice endpoints (PascalCase, appended to the base URL). */
export declare const MYMB_ENDPOINTS: {
    readonly GET_PREZZATURA_MULTIPLA: "GetPrezzaturaMultipla";
    readonly GET_LISTA_ARTICOLI_ALTERNATIVI: "GetListaArticoliAlternativi";
    readonly GET_TESTATE_CON_INFO_CONSEGNA: "GetTestateConInfoConsegna";
    readonly GET_CLIENTE: "GetCliente";
    readonly GET_ESPOSIZIONE_CLIENTE_INFO: "GetEsposizioneClienteInfo";
    readonly GET_LISTA_SCADENZE_CON_INFO: "GetListaScadenzeConInfo";
    readonly GET_TESTATE_FATT_CON_INFO: "GetTestateFATTConInfo";
    readonly GET_TESTATE_DDT_CON_INFO: "GetTestateDDTConInfo";
    readonly GET_RIGHE_CARRELLO: "GetRigheCarrello";
    readonly GET_INFO_TESTATA_ORDINE_X_CONTROLLO_CHIUSURA: "GetInfoTestataOrdineXControlloChiusura";
    readonly GET_RIGHE_CON_INFO_CONSEGNA: "GetRigheConInfoConsegna";
    readonly GET_RIGHE_DDT_CON_INFO: "GetRigheDDTConInfo";
    readonly GET_RIGHE_FATT_CON_INFO: "GetRigheFATTConInfo";
};
export type MyMbEndpoint = (typeof MYMB_ENDPOINTS)[keyof typeof MYMB_ENDPOINTS];
/** Raw MYMB coupon webservice endpoints (separate connection from pricing). */
export declare const MYMB_COUPON_ENDPOINTS: {
    readonly GET_STATO_COUPON_CLIENTE: "GetStatoCouponCliente";
    readonly GET_INFO_COUPON_FROM_DOCUMENTO: "GetInfoCouponFromDocumento";
    readonly UPDATE_TESTATA_DOCUMENTO_CON_COUPON: "UpdateTestataDocumentoConCoupon";
    readonly GET_PROMOZIONE_BASE_X_ARTICOLO: "GetPromozioneBaseXArticolo";
};
export type MyMbCouponEndpoint = (typeof MYMB_COUPON_ENDPOINTS)[keyof typeof MYMB_COUPON_ENDPOINTS];
//# sourceMappingURL=endpoints.d.ts.map