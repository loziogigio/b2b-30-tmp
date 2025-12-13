// @utils/adapter/cart-adapter.ts
import type { CartSummary, Item } from '@contexts/cart/cart.utils';
import type { Brand } from '@framework/types';
import {
  PackagingOption,
  PackagingOptionLegacy,
} from '@utils/transform/erp-prices';

// --- helpers -------------------------------------------------
const num = (v: any, d = 0) => {
  if (v == null || v === '') return d;
  const s = typeof v === 'string' ? v.replace(',', '.') : v;
  const n = Number(s);
  return Number.isFinite(n) ? n : d;
};

const val = <T = any>(...candidates: any[]): T | undefined =>
  candidates.find((x) => x !== undefined && x !== null && x !== '');

// Guard if API returns an object keyed by rowId: { "10": {...}, "20": {...} }
const values = (obj: any) => Object.keys(obj ?? {}).map((k) => (obj as any)[k]);

// Optional: pick packaging helpers (keep as-is if not needed)
function pickDefaultPackaging(imballi: any) {
  const opts = imballi?.packaging_options ?? [];
  return opts.find((o: any) => o.IsImballoDiDefaultXVendita) ?? null;
}
function pickSmallestPackaging(imballi: any) {
  const opts = imballi?.packaging_options ?? [];
  return (
    opts.find((o: any) => o.IsImballoPiuPiccolo) ??
    opts
      .slice()
      .sort((a: any, b: any) => num(a.QtaXImballo) - num(b.QtaXImballo))[0] ??
    null
  );
}

// --- core mappers --------------------------------------------
export function mapServerCartToItems(apiResponse: any): Item[] {
  const rowsDict = apiResponse?.message?.data ?? apiResponse?.data ?? [];
  const rows = Array.isArray(rowsDict) ? rowsDict : values(rowsDict);

  return rows.map((row: any): Item => {
    // Stable ids
    const rowId = String(
      val(
        row.row_id,
        row.id_riga,
        row.riga,
        row.riga_id,
        row.n_riga,
        row.progressivo,
        row.id,
      ) ?? '',
    );
    const id: string | number =
      val(row.id, row.product_id, row.id_prodotto, row.sku) ??
      `${val(row.id_cart, row.id_carrello) || 'cart'}-${rowId || Math.random()}`;

    // Pricing
    const priceDiscount = num(
      val(row.price_discount, row.prezzo_netto, row.netto, row.price),
      0,
    );
    const priceGross = num(
      val(row.price_gross, row.gross_price, row.prezzo_lordo, row.price),
      0,
    );
    const vatRate = num(val(row.vat_rate, row.aliquota_iva, row.iva), 0);

    // Quantity & units
    const quantity = num(val(row.quantity, row.qty, row.qta, row.quantita), 0);
    const uom = val(row.um, row.uom, row.unita_misura);

    // Flags
    const isPromo =
      Boolean(val(row.is_promo, row.promo, row.promo_row)) ||
      (priceDiscount > 0 && priceGross > 0 && priceDiscount < priceGross);

    // Descriptives
    const name = val(
      row.name,
      row.titolo,
      row.descrizione_breve,
      row.descrizione,
    );
    const model = val(row.modello, row.model);
    const shortDescription = val(row.short_descr, row.descrizione_breve);
    const description = val(row.description, row.descrizione);
    const image = val(row.image, row.image_url, row.thumbnail, row.thumb);
    const brand: Brand | undefined = row.brand;
    const slug = val(row.slug, row.permalink, row.link);

    const id_parent = val(row.id_father, row.parent_id, row.id_parent);
    const parent_sku = val(row.parent_sku, row.sku_parent);

    const promo_code = row.promo_code ?? 0;
    const promo_row = row.promo_row ?? 0;
    const listing_type_discounts = row.listing_type_discounts ?? '';

    const packaging_options_all: PackagingOption[] = toPackagingOptions(
      row.imballi.packaging_options,
    );

    // IMPORTANT: keep legacy fields populated for back-compat
    // Set `price` to the net/discounted unit so existing total calculators still work
    const price = priceDiscount || priceGross || 0;

    return {
      // Identifiers
      id,
      rowId,
      sku: row.sku,
      slug,
      id_parent,
      parent_sku,

      // Descriptive
      name,
      model,
      shortDescription,
      description,
      brand,
      image,

      // Quantities / units
      quantity,
      uom,
      mvQty: val(row.mv, row.min_vendita, row.moq),
      cfQty: val(row.cf, row.conf, row.pz_confezione),

      // Pricing (canonical)
      priceDiscount,
      priceGross,
      isPromo,

      // Pricing (legacy / snake_case mirrors, some UIs still read these)
      price, // fallback used by older calculators
      price_discount: priceDiscount,
      price_gross: priceGross,
      gross_price: priceGross,
      vat_rate: vatRate,
      promo_code: promo_code,
      promo_row: promo_row,
      packaging_options_all: packaging_options_all,
      listing_type_discounts: listing_type_discounts,

      // Meta / raw passthrough
      __cartMeta: {
        price_discount: priceDiscount,
        gross_price: priceGross,
        vat_rate: vatRate,
        is_promo: isPromo,
        totale_no_sconto: num(row.totale_no_sconto),
        totale_sconto: num(row.totale_sconto),
        imballi: row.imballi,
        packaging_option_default: pickDefaultPackaging(row.imballi),
        packaging_option_smallest: pickSmallestPackaging(row.imballi),
        availability: row.availability,
        id_cart: val(row.id_cart, row.id_carrello),
        row_raw: row, // keep full row for debugging if needed
      },
    } satisfies Item;
  });
}

export function mapServerCartToSummary(apiResponse: any): CartSummary {
  const msg = apiResponse?.message ?? apiResponse ?? {};
  const min = msg.min_order ?? {};

  const toBool = (v: any) => v === true || v === 1 || v === '1' || v === 'true';

  const num = (v: any, d = 0) => {
    if (v == null || v === '') return d;
    const s = typeof v === 'string' ? v.replace(',', '.') : v;
    const n = Number(s);
    return Number.isFinite(n) ? n : d;
  };

  const val = <T = any>(...c: any[]): T | undefined =>
    c.find((x) => x !== undefined && x !== null && x !== '');

  return {
    idCart: val(msg.id_cart, msg.id_carrello) as any,
    clientId: msg.client_id,
    addressCode: msg.address_code,
    closeEnable: toBool(msg.close_enable),
    minOrder: {
      warning: String(min.warning ?? ''),
      minimumAmount: num(min.minimum_amount, 0),
      compliant: toBool(min.compliant),
    },
    transportCost: num(val(msg.spese_trasporto, msg.shipping_cost), 0),
    transportFreeAbove: num(
      val(msg.importo_spese_zero, msg.free_shipping_threshold),
      0,
    ),
    totalNet: num(val(msg.totale_netto, msg.total_net), 0),
    totalGross: num(val(msg.totale_lordo, msg.total_gross), 0),
    vat: num(val(msg.iva, msg.vat), 0),
    totalDoc: num(val(msg.totale_doc, msg.total_doc, msg.total), 0),
    showDiscountPrice: Boolean(msg.show_discount_price),
    packaging: msg.imballi,
  };
}

/** Convenience: everything the cart endpoint returns, normalized */
export function mapServerCart(apiResponse: any): {
  items: Item[];
  summary: CartSummary;
} {
  return {
    items: mapServerCartToItems(apiResponse),
    summary: mapServerCartToSummary(apiResponse),
  };
}

// --- Type guard ---
const isLegacyPackaging = (x: any): x is PackagingOptionLegacy =>
  x &&
  (typeof x.CodiceImballo1 === 'string' ||
    typeof x.QtaXImballo !== 'undefined');

// --- Single-item mapper ---
export const mapLegacyPackaging = (
  p: PackagingOptionLegacy,
): PackagingOption => ({
  packaging_uom_description: String(p.DescrizioneUM ?? ''),
  packaging_code: String(p.CodiceImballo1 ?? p.label ?? ''),
  packaging_is_default: Boolean(
    p.IsImballoDiDefaultXVendita || p.IsImballoDiDefaultXVenditaDiretta,
  ),
  packaging_is_smallest: Boolean(p.IsImballoPiuPiccolo),
  qty_x_packaging: Number(
    p.QtaXImballo ?? 1, // fallbacks if needed
  ),
  packaging_uom: String(p.UM ?? ''),
});

// --- Array normalizer (handles mixed arrays just in case) ---
export const toPackagingOptions = (
  arr: Array<PackagingOption | PackagingOptionLegacy> | undefined | null,
): PackagingOption[] => {
  if (!arr || !Array.isArray(arr)) return [];
  const mapped = arr.map((x) =>
    isLegacyPackaging(x) ? mapLegacyPackaging(x) : x,
  );

  // optional: trim codes, coerce numbers safely
  return mapped.map((o) => ({
    ...o,
    packaging_code: o.packaging_code.trim(),
    qty_x_packaging: Number(o.qty_x_packaging ?? 1),
  }));
};
