"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCartClosureInfo = buildCartClosureInfo;
/** Raw ERP payload → typed closure info. Pure. */
function buildCartClosureInfo(raw) {
    const totals = Array.isArray(raw?.TotaliDocumento)
        ? raw.TotaliDocumento
        : [];
    const at = (i) => Number(totals[i] ?? 0) || 0;
    return {
        compliant: raw?.IsTotaleDocumentoConforme === true,
        minimumAmount: Number(raw?.ImportoMinimoOrdine ?? 0) || 0,
        freeShippingAbove: Number(raw?.ImportoMinimoOrdinePerSpeseTrasportoAZero ?? 0) || 0,
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
//# sourceMappingURL=cart-closure.js.map