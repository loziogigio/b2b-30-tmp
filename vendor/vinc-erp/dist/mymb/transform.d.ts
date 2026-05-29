import type { MyMbErpSettings, MyMbPriceEntry, ProductLabelAction } from '../types/pricing.js';
interface LabelConfig {
    isManagedSubstitutes: boolean;
    isManagedSupplierOrder: boolean;
    cases: Record<string, {
        label: string;
        addToCart: boolean;
    }>;
}
/**
 * Port of Python `get_label_and_cart_status`. Determines the availability
 * "case" (0..5) and resolves label / add-to-cart from `config.cases`.
 */
export declare function getLabelAndCartStatus(quantityAvailable: number, substituteAvailable: unknown[], orderSupplierAvailable: unknown[], config: LabelConfig): ProductLabelAction;
type RawPackaging = Record<string, unknown> & {
    IdImballo?: number;
};
/**
 * Port of Python `get_packaging_options`. Returns the packaging rows whose
 * `IdImballo` is in `orderIds`, ordered to match `orderIds`, each copied and
 * enriched with `id`/`label`/`amount`.
 */
export declare function getPackagingOptions(list: RawPackaging[] | undefined, orderIds: number[]): Array<RawPackaging & {
    id: number;
    label: unknown;
    amount: unknown;
}>;
/**
 * Port of the per-row body of Python `get_multiple_prices`. Pure: the
 * substitute-fallback network call is applied by the client afterwards.
 */
export declare function buildPriceEntry(price: Record<string, any>, settings: MyMbErpSettings): MyMbPriceEntry;
export {};
//# sourceMappingURL=transform.d.ts.map