import type { MyMbPriceEntry, PriceQuery } from './types/pricing.js';
export interface ErpErrorDetail {
    endpoint?: string;
    status?: number;
    returnCode?: number;
}
/** Typed error for any ERP request failure. */
export declare class ErpError extends Error {
    readonly endpoint?: string;
    readonly status?: number;
    readonly returnCode?: number;
    constructor(message: string, detail?: ErpErrorDetail);
}
/**
 * Provider-agnostic ERP contract. Method set grows per follow-on plan.
 * Pricing slice only, for now.
 */
export interface ErpClient {
    getMultiplePrices(input: PriceQuery): Promise<Record<string, MyMbPriceEntry>>;
    /** Internal codes of substitute articles for an item (GetListaArticoliAlternativi). */
    getSubstituteItems(entityCode: string, idCart?: number, pricingDate?: string): Promise<string[]>;
}
//# sourceMappingURL=erp-client.d.ts.map