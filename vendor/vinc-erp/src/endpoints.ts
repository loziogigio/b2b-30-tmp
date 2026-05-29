/** Raw MYMB ERP webservice endpoints (PascalCase, appended to the base URL). */
export const MYMB_ENDPOINTS = {
  GET_PREZZATURA_MULTIPLA: 'GetPrezzaturaMultipla',
  GET_LISTA_ARTICOLI_ALTERNATIVI: 'GetListaArticoliAlternativi',
  GET_TESTATE_CON_INFO_CONSEGNA: 'GetTestateConInfoConsegna',
  GET_CLIENTE: 'GetCliente',
  GET_ESPOSIZIONE_CLIENTE_INFO: 'GetEsposizioneClienteInfo',
  GET_LISTA_SCADENZE_CON_INFO: 'GetListaScadenzeConInfo',
  GET_TESTATE_FATT_CON_INFO: 'GetTestateFATTConInfo',
  GET_TESTATE_DDT_CON_INFO: 'GetTestateDDTConInfo',
} as const;

export type MyMbEndpoint =
  (typeof MYMB_ENDPOINTS)[keyof typeof MYMB_ENDPOINTS];
