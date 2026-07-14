/**
 * MyMB `GetInfoTestataOrdineXControlloChiusura` — order-header info used to
 * decide whether a cart may be closed.
 *
 * This is where the ERP's minimum-order rule (IMPMIN) lives. It is an
 * order-HEADER rule ("testata"), not a per-article one, which is why it does
 * not ride along with GetPrezzaturaMultipla's promo rows.
 *
 * Mirrors the legacy `looxb2b_ordine_minimo_spese_trasporto($id_carrello)`.
 */
export interface MyMbCartClosureInfo {
  /** ERP's own verdict on the current cart. Only meaningful once the ERP cart
   *  actually holds the rows — an empty/unknown cart reports `true`. */
  compliant: boolean;
  /** ImportoMinimoOrdine — the minimum order value (e.g. 1200). 0 = none. */
  minimumAmount: number;
  /** ImportoMinimoOrdinePerSpeseTrasportoAZero — spend above this to get free shipping. */
  freeShippingAbove: number;
  /** TotaleSpeseDiTrasporto */
  transportCost: number;
  /** TotaliDocumento[0] */
  totalNet: number;
  /** TotaliDocumento[8] */
  vat: number;
  /** TotaliDocumento[9] */
  totalDoc: number;
  /** TotaliDocumento[10] */
  totalGross: number;
  deliveryRoundCode: string;
  storeCode: string;
  transportCode: string;
  shippingDate: string;
}

/** Raw ERP payload → typed closure info. Pure. */
export function buildCartClosureInfo(raw: any): MyMbCartClosureInfo {
  const totals: unknown[] = Array.isArray(raw?.TotaliDocumento)
    ? raw.TotaliDocumento
    : [];
  const at = (i: number): number => Number(totals[i] ?? 0) || 0;

  return {
    compliant: raw?.IsTotaleDocumentoConforme === true,
    minimumAmount: Number(raw?.ImportoMinimoOrdine ?? 0) || 0,
    freeShippingAbove:
      Number(raw?.ImportoMinimoOrdinePerSpeseTrasportoAZero ?? 0) || 0,
    transportCost: Number(raw?.TotaleSpeseDiTrasporto ?? 0) || 0,
    // Index positions are the legacy contract (see looxb2b.module):
    // [0] netto, [8] iva, [9] totale documento, [10] lordo.
    totalNet: at(0),
    vat: at(8),
    totalDoc: at(9),
    totalGross: at(10),
    deliveryRoundCode: String(raw?.CodiceGiroDiConsegna ?? ''),
    storeCode: String(raw?.CodicePuntoVendita ?? ''),
    transportCode: String(raw?.CodiceTrasporto ?? ''),
    shippingDate: String(raw?.DataSpedizione ?? ''),
  };
}
