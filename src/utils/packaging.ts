import type { ErpPriceData, PackagingOption } from '@utils/transform/erp-prices';


export function getPackagingGridData(
  pdOrOptions?: ErpPriceData | PackagingOption[],
  uomOverride?: string
) {
  let options: PackagingOption[] = [];
  let uom = '—';

  if (Array.isArray(pdOrOptions)) {
    // Using plain options[]
    options = pdOrOptions ?? [];
    const def =
      options.find(o => o.packaging_is_default) ??
      options[0];

     uom = uomOverride ?? def?.packaging_uom ?? def?.packaging_uom_description ?? '—';
  } else if (pdOrOptions) {
    // Using ErpPriceData
    options = pdOrOptions.packaging_options_all ?? [];
    const def =
      pdOrOptions.packaging_option_default ??
      options.find(o => o.packaging_is_default) ??
      options[0];

    uom = uomOverride ?? def?.packaging_uom ?? def?.packaging_uom_description ?? '—';
  } else {
    // Nothing passed
    uom = uomOverride ?? '—';
  }

  const cols = options.length + 1; // UM + each code
  return { options, uom, cols };
}
