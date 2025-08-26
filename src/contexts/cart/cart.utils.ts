// @contexts/cart/cart.utils

import type { Brand } from '@framework/types';

export interface CartSummary {
  idCart: string | number;
  clientId: string | number;
  addressCode?: string;
  closeEnable?: boolean; // "1" -> true
  minOrder?: {
    warning: string;
    minimumAmount: number;
    compliant: boolean;
  };
  transportCost: number;       // spese_trasporto
  transportFreeAbove: number;  // importo_spese_zero
  totalNet: number;            // totale_netto
  totalGross: number;          // totale_lordo
  vat: number;                 // iva
  totalDoc: number;            // totale_doc
  showDiscountPrice?: boolean;
  // keep room for server blobs you may use later
  packaging?: any;
}


export interface Item {
  /** Identifiers */
  id: string | number;
  rowId?: string;                // CartRow.rowId (UI row number)
  sku?: string;
  slug?: string;
  id_parent?: string | number;
  parent_sku?: string;

  /** Descriptive */
  name?: string;
  model?: string;
  shortDescription?: string;
  description?: string;
  brand?: Brand;
  image?: string;

  /** Quantities / units */
  quantity: number;              // make it required to simplify totals
  stock?: number;
  uom?: string;
  mvQty?: number;
  cfQty?: number;

  /** Pricing (canonical) */
  priceDiscount?: number;        // unit NET (discounted)  === CartRow.priceDiscount
  priceGross?: number;           // unit GROSS             === CartRow.priceGross
  isPromo?: boolean;

  /** Pricing (back-compat / legacy fields still present in data) */
  price?: number;                // legacy fallback
  price_discount?: number;       // legacy snake_case
  price_gross?: number;          // legacy snake_case
  gross_price?: number;          // some payloads use this
  vat_rate?: number;             // e.g. 22
  promo_code?: string | number;
  promo_row?: string | number;

  /** ERP/meta passthrough */
  __cartMeta?: {
    price_discount?: number;
    gross_price?: number;
    vat_rate?: number;
    [k: string]: any;
  } | any;

  /** Allow extra fields without type errors */
  [key: string]: any;
}


export interface UpdateItemInput extends Partial<Omit<Item, 'id'>> {}

export function addItemWithQuantity(
  items: Item[],
  item: Item,
  quantity: number,
) {
  if (quantity <= 0)
    throw new Error("cartQuantity can't be zero or less than zero");
  const existingItemIndex = items.findIndex(
    (existingItem) => existingItem.id === item.id,
  );

  if (existingItemIndex > -1) {
    const newItems = [...items];
    newItems[existingItemIndex].quantity! += quantity;
    return newItems;
  }
  return [...items, { ...item, quantity }];
}

export function removeItemOrQuantity(
  items: Item[],
  id: Item['id'],
  quantity: number,
) {
  return items.reduce((acc: Item[], item) => {
    if (item.id === id) {
      const newQuantity = item.quantity! - quantity;

      return newQuantity > 0
        ? [...acc, { ...item, quantity: newQuantity }]
        : [...acc];
    }
    return [...acc, item];
  }, []);
}
// Simple CRUD for Item
export function addItem(items: Item[], item: Item) {
  return [...items, item];
}

export function getItem(items: Item[], id: Item['id']) {
  return items.find((item) => item.id === id);
}

export function updateItem(
  items: Item[],
  id: Item['id'],
  item: UpdateItemInput,
) {
  return items.map((existingItem) =>
    existingItem.id === id ? { ...existingItem, ...item } : existingItem,
  );
}

export function removeItem(items: Item[], id: Item['id']) {
  return items.filter((existingItem) => existingItem.id !== id);
}

export function inStock(items: Item[], id: Item['id']) {
  const item = getItem(items, id);
  if (item) return item['quantity']! < item['stock']!;
  return false;
}

export const calculateItemTotals = (items: Item[]) =>
  items.map((item) => ({
    ...item,
    itemTotal: item.price * item.quantity!,
  }));

export const calculateTotal = (items: Item[]) =>
  items.reduce((total, item) => total + item.quantity! * item.price, 0);

export const calculateTotalItems = (items: Item[]) =>
  items.reduce((sum, item) => sum + item.quantity!, 0);

export const calculateUniqueItems = (items: Item[]) => items.length;
