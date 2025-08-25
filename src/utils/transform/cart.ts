// utils/transform/cart.ts

export interface CartItem {
    rowId: string;
    cartId: string;
    sku: string;
    productId: string;
    parentId?: string;
    code: string;
    name: string;
    model?: string;
    shortDescription?: string;
    quantity: number;
    price: number;
    priceDiscount: number;
    discount1?: string;
    discount2?: string;
    discount3?: string;
    listingTypeDiscounts?: string;
    totalGross: number;
    totalNet: number;
    image?: string;
    link?: string;
    uom: string;
    packaging: any; // refine later
  }
  
  export interface CartInfo {
    idCart: string;
    clientId: string;
    addressCode: string;
    transportCost: number;
    transportFreeAbove: number;
    totalNet: number;
    totalGross: number;
    vat: number;
    totalDoc: number;
    packaging: any; // refine later
    items: CartItem[];
  }
  
export function transformCartResponse(apiResponse: any): CartInfo {
  const message = apiResponse?.message?.data ?? {};
  const cartMeta = apiResponse?.message ?? {};

  // Transform rows (items)
  const items: CartItem[] = Object.values(message).map((row: any) => ({
    rowId: row.row_id ?? row.id_riga,
    cartId: row.id_cart ?? row.id_carrello,
    sku: row.sku,
    productId: row.id,
    parentId: row.id_father,
    code: row.codice_figura,
    name: row.name,
    model: row.modello,
    shortDescription: row.short_descr,
    quantity: Number(row.quantity),
    price: Number(row.price),
    priceDiscount: Number(row.price_discount),
    discount1: row.sconto1,
    discount2: row.sconto2,
    discount3: row.sconto3,
    listingTypeDiscounts: row.listing_type_discounts,
    totalGross: Number(row.totale_no_sconto),
    totalNet: Number(row.totale_sconto),
    image: row.image,
    link: row.link,
    uom: row.um,
    packaging: row.imballi,
  }));

  // Transform cart info
  return {
    idCart: cartMeta.id_cart ?? cartMeta.id_carrello,
    clientId: cartMeta.client_id,
    addressCode: cartMeta.address_code,
    transportCost: Number(cartMeta.spese_trasporto ?? 0),
    transportFreeAbove: Number(cartMeta.importo_spese_zero ?? 0),
    totalNet: Number(cartMeta.totale_netto),
    totalGross: Number(cartMeta.totale_lordo),
    vat: Number(cartMeta.iva),
    totalDoc: Number(cartMeta.totale_doc),
    packaging: cartMeta.imballi,
    items,
  };
}
