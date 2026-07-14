import type { ErpPriceData, PromoOffer } from '@utils/transform/erp-prices';

export interface BestPrice {
  /** min(listino, cheapest qualifying promo). 0 when no price data. */
  effectivePrice: number;
  /** Which side won. Ties go to the promo. */
  source: 'listino' | 'promo';
  /** The promo that sets the price, when source === 'promo'. */
  offer: PromoOffer | null;
  /** Any promo exists on this article — true even when the listino wins. */
  hasPromos: boolean;
  /** Titles of all promos, winner first, placeholders removed. */
  promoTitles: string[];
}

/** Drop placeholder titles ("---", "___", "   ") that the ERP sometimes emits. */
export function cleanTitle(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/[-_\s]/g, '') ? raw.trim() : '';
}

/**
 * The promos the LISTINO's default packaging already triggers — i.e. those
 * whose required qty step is no larger than the default packaging's step.
 * A promo requiring more than the customer would buy by default must not set
 * the displayed price.
 */
export function qualifyingOffers(priceData: ErpPriceData): PromoOffer[] {
  const offers = priceData.all_promo_offers ?? [];
  if (!offers.length) return [];
  const listinoMv = Math.max(
    Number(priceData.packaging_option_default?.qty_x_packaging ?? 1),
    1,
  );
  return offers.filter(
    (o) => Math.max(Number(o.promo_qty_required ?? 0), 1) <= listinoMv,
  );
}

/**
 * The single answer to "what price do we show?".
 *
 * The ERP pre-selects one `improving_promo` and flattens it onto
 * `price_discount`, but a product can carry several promos — and the listino
 * itself can undercut all of them. Reducing over `all_promo_offers` and
 * comparing against `net_price` is the only way to show the price the customer
 * actually pays.
 */
export function selectBestPrice(priceData?: ErpPriceData | null): BestPrice {
  if (!priceData) {
    return {
      effectivePrice: 0,
      source: 'listino',
      offer: null,
      hasPromos: false,
      promoTitles: [],
    };
  }

  const listino = Number(priceData.net_price ?? 0);
  const allOffers = priceData.all_promo_offers ?? [];
  const hasPromos = allOffers.length > 0;
  const candidates = qualifyingOffers(priceData);

  const cheapest = candidates.length
    ? candidates.reduce((best, cur) =>
        Number(cur.promo_net_price) < Number(best.promo_net_price) ? cur : best,
      )
    : null;

  // Ties go to the promo, so a badged article always has a promo genuinely
  // setting its price.
  const promoWins =
    cheapest != null && Number(cheapest.promo_net_price) <= listino;

  const ordered = cheapest
    ? [cheapest, ...allOffers.filter((o) => o !== cheapest)]
    : allOffers;

  return {
    effectivePrice: promoWins ? Number(cheapest!.promo_net_price) : listino,
    source: promoWins ? 'promo' : 'listino',
    offer: promoWins ? cheapest : null,
    hasPromos,
    promoTitles: ordered.map((o) => cleanTitle(o.promo_title)).filter(Boolean),
  };
}
