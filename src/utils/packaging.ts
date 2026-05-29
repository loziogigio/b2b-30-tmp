import type {
  ErpPriceData,
  PackagingOption,
} from '@utils/transform/erp-prices';

export function getPackagingGridData(
  pdOrOptions?: ErpPriceData | PackagingOption[],
  uomOverride?: string,
) {
  let options: PackagingOption[] = [];
  let uom = '—';

  if (Array.isArray(pdOrOptions)) {
    // Using plain options[]
    options = pdOrOptions ?? [];
    const def = options.find((o) => o.packaging_is_default) ?? options[0];

    uom =
      uomOverride ??
      def?.packaging_uom ??
      def?.packaging_uom_description ??
      '—';
  } else if (pdOrOptions) {
    // Using ErpPriceData
    options = pdOrOptions.packaging_options_all ?? [];
    const def =
      pdOrOptions.packaging_option_default ??
      options.find((o) => o.packaging_is_default) ??
      options[0];

    uom =
      uomOverride ??
      def?.packaging_uom ??
      def?.packaging_uom_description ??
      '—';
  } else {
    // Nothing passed
    uom = uomOverride ?? '—';
  }

  const cols = options.length + 1; // UM + each code
  return { options, uom, cols };
}

/**
 * Packaging rows to display: the ERP-filtered set (`packaging_options`, which
 * the client selects + orders by the tenant's `packaging_options_id`),
 * normalized to the `PackagingOption` (`_all`) shape used by cards/rows/modals.
 * Falls back to the full set (`packaging_options_all`) when no filter is
 * configured/matched, so the line is never blank.
 */
export function buildDisplayPackaging(
  priceData: ErpPriceData,
): PackagingOption[] {
  const filtered = (priceData.packaging_options ?? []) as any[];
  if (filtered.length === 0) return priceData.packaging_options_all ?? [];
  return filtered.map((o) => ({
    packaging_uom_description: o.DescrizioneUM,
    packaging_code: o.label ?? o.CodiceImballo1,
    packaging_is_default: o.IsImballoDiDefaultXVendita,
    packaging_is_smallest: o.IsImballoPiuPiccolo,
    qty_x_packaging: o.amount ?? o.QtaXImballo,
    packaging_uom: o.UM,
  }));
}

/**
 * Compose the filtered packaging into label parts, e.g.
 * ["UM: PZ", "MV: 1", "CF: 2"] — UM (unit of the default packaging) followed by
 * one `<code>: <qty>` per filtered packaging option, in `packaging_options_id`
 * order. Shared by the offer rows and the search card/row/overlay.
 */
export function buildPackagingParts(priceData: ErpPriceData): string[] {
  const um = priceData.packaging_option_default?.packaging_uom || '';
  const options = buildDisplayPackaging(priceData);
  return [
    um ? `UM: ${um}` : '',
    ...options.map((o) => `${o.packaging_code}: ${o.qty_x_packaging ?? '1'}`),
  ].filter(Boolean);
}
