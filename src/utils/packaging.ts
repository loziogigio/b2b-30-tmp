import type { ErpPriceData } from '@utils/transform/erp-prices';

export type PackagingOption = {
  packaging_code: string;
  qty_x_packaging?: number | string;
};

export function getPackagingGridData(pd?: ErpPriceData) {
  const options: PackagingOption[] = pd?.packaging_options_all ?? [];
  const uom = pd?.packaging_option_default?.packaging_uom ?? '—';
  const cols = options.length + 1; // UM + each code
  return { options, uom, cols };
}
