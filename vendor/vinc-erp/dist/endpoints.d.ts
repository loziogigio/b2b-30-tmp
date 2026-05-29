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
};
export type MyMbEndpoint = (typeof MYMB_ENDPOINTS)[keyof typeof MYMB_ENDPOINTS];
//# sourceMappingURL=endpoints.d.ts.map