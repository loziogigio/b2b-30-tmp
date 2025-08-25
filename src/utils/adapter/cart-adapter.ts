// @utils/adapter/cart-adapter.ts
import type { Item } from '@contexts/cart/cart.utils';

const num = (v: any, d = 0) => {
  const n = typeof v === 'string' ? v.replace(',', '.') : v;
  const x = Number(n);
  return Number.isFinite(x) ? x : d;
};

// Safe values() for ES5 target (avoid relying on Object.values polyfill)
const values = (obj: any) => Object.keys(obj ?? {}).map(k => (obj as any)[k]);

/**
 * Map full server cart response -> local Item[] for CartProvider
 * Expects the structure you pasted:
 * {
 *   success: true,
 *   message: {
 *     data: { "10": {...row}, "20": {...row} },
 *     ...cart totals...
 *   }
 * }
 */
export function mapServerCartToItems(apiResponse: any): Item[] {
  const rowsDict = apiResponse?.message?.data ?? {};
  const rows = values(rowsDict);

  return rows.map((row: any): Item => {
    // Choose a stable id for the cart item (row id is safest inside a cart)
    const id =
      row.row_id ??
      row.id_riga ??
      row.id ??              // fallback to product id if needed
      row.sku ??             // last resort
      `${row.id_cart || ''}-${row.sku || ''}`;

    const price = num(row.price_discount ?? row.price);
    const quantity = num(row.quantity, 0);

    return {
      // ---- local Item shape (required by your reducer) ----
      id,
      price,
      quantity,
      // optional stock if you have it; not in your example, so leave undefined
      stock: undefined,

      // keep anything else you want on the item
      sku: row.sku,
      name: row.name,
      model: row.modello,
      shortDescription: row.short_descr,
      image: row.image,
      link: row.link,

      // raw server ids for debugging/links
      row_id: row.row_id ?? row.id_riga,
      cart_id: row.id_cart ?? row.id_carrello,
      product_id: row.id,
      parent_id: row.id_father,
      code: row.codice_figura,

      // useful pricing flags
      price_discount: num(row.price_discount),
      price_gross: num(row.price),
      total_gross_row: num(row.totale_no_sconto),
      total_net_row: num(row.totale_sconto),
      uom: row.um,

      // discounts
      discount1: row.sconto1,
      discount2: row.sconto2,
      discount3: row.sconto3,
      listing_type_discounts: row.listing_type_discounts,

      // keep packaging blob as-is (you already consume a similar structure)
      packaging: row.imballi,

      // meta your UI uses elsewhere
      __cartMeta: {
        is_promo: row.is_promo ?? (row.promo === '1' || row.promo_row === '1'),
        availability: row.availability, // not present in sample; left for parity
        packaging_option_default: pickDefaultPackaging(row.imballi),
        packaging_option_smallest: pickSmallestPackaging(row.imballi),
      },
    } as Item;
  });
}

/** Optional: map cart-level summary/totals for your UI */
export function mapServerCartToSummary(apiResponse: any) {
  const msg = apiResponse?.message ?? {};
  return {
    idCart: msg.id_cart ?? msg.id_carrello,
    clientId: msg.client_id,
    addressCode: msg.address_code,
    transportCost: num(msg.spese_trasporto),
    transportFreeAbove: num(msg.importo_spese_zero),
    totalNet: num(msg.totale_netto),
    totalGross: num(msg.totale_lordo),
    vat: num(msg.iva),
    totalDoc: num(msg.totale_doc),
    packaging: msg.imballi,
    showDiscountPrice: !!msg.show_discount_price,
  };
}

/** Helpers to extract default/smallest packaging from the server blob */
function pickDefaultPackaging(imballi: any) {
  const opts = imballi?.packaging_options ?? [];
  return opts.find((o: any) => o.IsImballoDiDefaultXVendita) ?? null;
}
function pickSmallestPackaging(imballi: any) {
  const opts = imballi?.packaging_options ?? [];
  // server marks it, but also fall back to smallest QtaXImballo
  return (
    opts.find((o: any) => o.IsImballoPiuPiccolo) ??
    opts.slice().sort((a: any, b: any) => num(a.QtaXImballo) - num(b.QtaXImballo))[0] ??
    null
  );
}
