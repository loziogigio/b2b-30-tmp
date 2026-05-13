export function getCartItemRenderKey(item: any, index: number): string {
  return [
    item?.rowId ?? 'row',
    item?.id ?? 'item',
    item?.promo_code ?? 0,
    item?.promo_row ?? 0,
    index,
  ].join('-');
}
