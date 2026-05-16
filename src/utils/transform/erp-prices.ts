export interface PackagingOption {
  packaging_uom_description: string;
  packaging_code: string;
  packaging_is_default: boolean;
  packaging_is_smallest: boolean;
  qty_x_packaging: number;
  packaging_uom: string;
}

export interface PackagingOptionLegacy {
  CodiceImballo1: string;
  Descrizione: string;
  DescrizioneUM: string;
  IdImballo: number;
  IsImballoDiDefaultXVendita: boolean;
  IsImballoDiDefaultXVenditaDiretta: boolean;
  IsImballoPiuPiccolo: boolean;
  Message: string;
  QtaXImballo: number;
  ReturnCode: number;
  UM: string;
  id: number;
  label: string;
  amount: number;
}

export interface SupplierArrival {
  article_code: string; // CodiceInternoArticolo
  expected_date?: string; // YYYY-MM-DD (from DataArrivoPrevista)
  confirmed_date?: string; // YYYY-MM-DD (from DataArrivoConfermata)
  week_number?: number; // NumeroDellaSettimana
  expected_qty?: number; // QuantitaArrivoPrevista
}
export interface ProductLabelAction {
  LABEL: string;
  ADD_TO_CART: boolean;
  availability: number;
  is_managed_substitutes: boolean;
  is_managed_supplier_order: boolean;
  substitute_available: boolean;
  order_supplier_available: SupplierArrival[];
  case: number;
}

export interface ImprovingPromo {
  is_improving_promo: boolean;
  is_improving_promo_net_price: boolean;
  promo_price: number;
  promo_code: string;
  promo_title: string;
  promo_row: number;
  start_promo_date: string; // ISO string
  end_promo_date: string; // ISO string
  discount_extra: number[];
  num_promo: number;
  num_promo_canvas: number;
  promozionale: boolean;
  is_promo: boolean;
  promo: boolean;
}

/**
 * Single promo offer in the all_promo list.
 * Each item represents a separately-addable line that the user can buy
 * (e.g. LISTINO uses base price, while each PROMO has its own qty/price/code).
 */
export interface PromoOffer {
  promo_code: string;
  promo_row: number;
  promo_title: string;
  promo_type: string;
  /** MV - QuantitaRichiesta: smallest qty step required to trigger promo */
  promo_qty_required: number;
  promo_packaging_required: number;
  promo_qty_per_packaging: number;
  promo_min_pieces: number;
  promo_min_value: number;
  /** PrezzoNettoConPromo - the discounted unit price */
  promo_net_price: number;
  /** PrezzoNettoListinoDiRiferimento - listino price the promo discounts from */
  promo_ref_list_price: number;
  promo_standard_price: number;
  promo_start_date: string;
  promo_end_date: string;
  promo_extra_discounts: number[];
  promo_gift_qty: number;
  promo_gift_sku?: string;
  promo_gift_uom?: string;
}

export interface ErpPriceData {
  entity_code: string;
  net_price: number;
  gross_price: number;
  price: number;
  price_discount: number;
  vat_percent: number;
  availability: number;
  discount: number[];

  packaging_option_smallest?: PackagingOption;
  packaging_option_default?: PackagingOption;
  packaging_options_all?: PackagingOption[];
  packaging_options?: PackagingOptionLegacy[];

  improving_promo?: ImprovingPromo;

  /** All promos available for this product (LISTINO is implicit, this lists each PROMO line). */
  all_promo_offers?: PromoOffer[];

  product_label_action?: ProductLabelAction;

  // Optional ERP/logic-related fields
  count_promo?: number;
  is_improving_promo_net_price?: boolean;
  buy_did?: boolean;
  buy_did_amount?: number;
  buy_did_last_date?: string;

  promo_price?: number;
  promo_code?: string;
  promo_row?: number;
  is_improving_promo?: boolean;
  is_promo?: boolean;
  promo?: boolean;
  promozionale?: boolean;
  promo_title?: string;
  start_promo_date?: string;
  end_promo_date?: string;
  discount_extra?: number[];
  num_promo?: number;
  num_promo_canvas?: number;
  discount_description: string;

  pricelist_type?: string;
  pricelist_code?: string;

  order_suplier_available?: SupplierArrival[];
  prod_substitution?: any[];
}

const fmtErpDate = (s?: string): string | undefined => {
  if (!s) return undefined;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; // DD/MM/YYYY -> YYYY-MM-DD
  return s; // already ISO-ish
};

const mapSupplierArrivals = (arr: any[]): SupplierArrival[] =>
  Array.isArray(arr)
    ? arr.map((r) => ({
        article_code: String(r?.CodiceInternoArticolo ?? ''),
        expected_date: fmtErpDate(r?.DataArrivoPrevista),
        confirmed_date: fmtErpDate(r?.DataArrivoConfermata),
        week_number:
          r?.NumeroDellaSettimana != null
            ? Number(r.NumeroDellaSettimana)
            : undefined,
        expected_qty: Number(r?.QuantitaArrivoPrevista ?? 0),
      }))
    : [];

export function transformErpPricesResponse(
  response: any,
): Record<string, ErpPriceData> {
  if (response?.status !== 'success' || !response.data) return {};

  const transformed: Record<string, ErpPriceData> = {};

  for (const [entityCode, raw] of Object.entries<any>(response.data)) {
    const promoRaw = raw.improving_promo ?? null;
    const allPromoRaw = Array.isArray(raw?.all_promo?.ListaPromo)
      ? raw.all_promo.ListaPromo
      : [];
    const allPromoOffers: PromoOffer[] = allPromoRaw
      .filter((p: any) => p && p.CodicePromozione)
      .map((p: any) => ({
        promo_code: String(p.CodicePromozione ?? ''),
        promo_row: Number(p.RigaPromozione ?? 0),
        promo_title: p.TitoloPromozione ?? '',
        promo_type: p.TipoPromozione ?? '',
        promo_qty_required: Number(p.QuantitaRichiesta ?? 0),
        promo_packaging_required: Number(p.ImballiRichiesti ?? 0),
        promo_qty_per_packaging: Number(p.QuantitaPerImballo ?? 0),
        promo_min_pieces: Number(p.ArticoliRichiesti ?? 0),
        promo_min_value: Number(p.AmmontareMinimoRichiesto ?? 0),
        promo_net_price: Number(p.PrezzoNettoConPromo ?? 0),
        promo_ref_list_price: Number(p.PrezzoNettoListinoDiRiferimento ?? 0),
        promo_standard_price: Number(p.PrezzoNettoStandard ?? 0),
        promo_start_date: formatPromoDate(p.DataInizioValitita),
        promo_end_date: formatPromoDate(p.DataFineValidita),
        promo_extra_discounts: [
          Number(p.ScontoExtra1 ?? 0),
          Number(p.ScontoExtra2 ?? 0),
          Number(p.ScontoExtra3 ?? 0),
        ],
        promo_gift_qty: Number(p.QuantitaArticoloOmaggio ?? 0),
        promo_gift_sku: p.CodiceArticoloInOmaggio ?? undefined,
        promo_gift_uom: p.UMArticoloOmaggio ?? undefined,
      }));
    const supplierRaw =
      raw?.product_label_action?.order_supplier_available ??
      raw?.order_suplier_available ??
      [];
    const supplierArrivals = mapSupplierArrivals(supplierRaw);

    transformed[entityCode] = {
      entity_code: entityCode,
      net_price: raw.net_price ?? 0,
      gross_price: raw.gross_price ?? 0,
      price: raw.price ?? 0,
      price_discount: raw.price_discount ?? 0,
      vat_percent: raw.vat_percent ?? 0,
      availability: raw.availability ?? 0,
      discount: raw.discount ?? [],

      packaging_option_smallest: raw.packaging_option_smallest ?? undefined,
      packaging_option_default: raw.packaging_option_default ?? undefined,
      packaging_options_all: raw.packaging_options_all ?? [],
      packaging_options: raw.packaging_options ?? [],

      count_promo: raw.count_promo,
      is_improving_promo_net_price: raw.is_improving_promo_net_price,
      buy_did: raw.buy_did,
      buy_did_amount: raw.buy_did_amount,
      buy_did_last_date: raw.buy_did_last_date,

      promo_price: raw.promo_price,
      promo_code: raw.promo_code,
      promo_row: raw.promo_row,
      is_improving_promo: raw.is_improving_promo,
      is_promo: raw.is_promo,
      promo: raw.promo,
      promozionale: raw.promozionale,
      promo_title: raw.promo_title,
      start_promo_date: formatPromoDate(raw.start_promo_date),
      end_promo_date: formatPromoDate(raw.end_promo_date),
      discount_extra: raw.discount_extra ?? [],
      discount_description: getPromoDescription(raw),
      num_promo: raw.num_promo,
      num_promo_canvas: raw.num_promo_canvas,

      pricelist_type: raw.pricelist_type,
      pricelist_code: raw.pricelist_code,

      order_suplier_available: supplierArrivals,
      prod_substitution: raw.prod_substitution ?? [],

      all_promo_offers: allPromoOffers,

      improving_promo:
        raw.is_promo && promoRaw
          ? {
              is_improving_promo: raw.is_improving_promo ?? false,
              is_improving_promo_net_price:
                raw.is_improving_promo_net_price ?? false,
              promo_price:
                promoRaw.PrezzoNettoConPromo ?? raw.price_discount ?? raw.price,
              promo_code: promoRaw.CodicePromozione ?? '',
              promo_title: promoRaw.TitoloPromozione ?? '',
              promo_row: promoRaw.RigaPromozione ?? 0,
              start_promo_date: formatPromoDate(promoRaw.DataInizioValitita),
              end_promo_date: formatPromoDate(promoRaw.DataFineValidita),
              discount_extra: [
                promoRaw.ScontoExtra1 ?? 0,
                promoRaw.ScontoExtra2 ?? 0,
                promoRaw.ScontoExtra3 ?? 0,
              ],
              num_promo: raw.num_promo ?? 0,
              num_promo_canvas: raw.num_promo_canvas ?? 0,
              promozionale: raw.promozionale ?? false,
              is_promo: raw.is_promo ?? false,
              promo: raw.promo ?? false,
            }
          : undefined,

      product_label_action: raw.product_label_action
        ? {
            LABEL: raw.product_label_action.LABEL ?? '',
            ADD_TO_CART: raw.product_label_action.ADD_TO_CART ?? false,
            availability: raw.product_label_action.quantity_available ?? 0,
            is_managed_substitutes:
              raw.product_label_action.is_managed_substitutes ?? false,
            is_managed_supplier_order:
              raw.product_label_action.is_managed_supplier_order ?? false,
            order_supplier_available: supplierArrivals,
            case: raw.case ?? 0,
            substitute_available: raw.substitute_available ?? false,
          }
        : undefined,
    };
  }

  return transformed;
}

export function formatPromoDate(dateStr?: string): string {
  if (!dateStr) return '';
  // Handles both DD/MM/YY and MM/DD/YYYY formats
  const parts = dateStr.split(' ')[0].split('/');
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const year = c.length === 2 ? '20' + c : c;
    if (+a > 12) {
      // DD/MM/YYYY
      return `${year}-${pad(b)}-${pad(a)}`;
    } else {
      // MM/DD/YYYY
      return `${year}-${pad(a)}-${pad(b)}`;
    }
  }
  return dateStr;
}

/**
 * Convert a "YYYY-MM-DD" string to Italian DD/MM/YYYY display format.
 * Pass-through for anything that doesn't match the strict ISO date
 * pattern, so callers can hand in either pre-normalized YMD or an
 * already-formatted string. For full ISO timestamps the synth in
 * inline-to-erp.ts already normalizes to YMD before this is called.
 */
export function formatYmdToItalian(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function pad(n: string | number): string {
  return String(n).padStart(2, '0');
}

function getPromoDescription(raw: any): string {
  const discount: number[] = raw.discount ?? [];
  const discount_extra: number[] = raw.discount_extra ?? [];

  const allDiscounts = [...discount, ...discount_extra].filter((v) => v !== 0);
  if (allDiscounts.length === 0) return '';

  const parts = allDiscounts.map((v) => `-${Math.abs(v)}%`);
  return parts.join(' ');
}
