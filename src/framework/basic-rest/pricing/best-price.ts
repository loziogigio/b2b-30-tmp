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
 * What to show as a promo's name.
 *
 * `TitoloPromozione` is frequently blank in MyMB — the promo is configured with
 * a code but no title. Rendering nothing in that case is what made promos look
 * nameless in the UI. The code (`CodicePromozione`) is always present and is
 * what the buyer and the back office actually refer to, so it is a far better
 * fallback than an empty chip or a generic "In offerta".
 */
export function promoLabel(offer?: {
  promo_title?: string;
  promo_code?: string;
}): string {
  if (!offer) return '';
  return cleanTitle(offer.promo_title) || (offer.promo_code ?? '').trim();
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

  const rawListino = Number(priceData.net_price ?? 0);
  // A missing/non-positive listino (e.g. the ERP omitted net_price, which
  // `transformErpPricesResponse` then defaults to 0) is not a real price and
  // must never "win" against a qualifying promo just by being the lowest
  // number.
  const hasListino = Number.isFinite(rawListino) && rawListino > 0;
  const listino = hasListino ? rawListino : Infinity;
  const allOffers = priceData.all_promo_offers ?? [];
  const hasPromos = allOffers.length > 0;
  const candidates = qualifyingOffers(priceData);

  const cheapest = candidates.length
    ? candidates.reduce((best, cur) =>
        Number(cur.promo_net_price) < Number(best.promo_net_price) ? cur : best,
      )
    : null;

  // Ties go to the promo, so a badged article always has a promo genuinely
  // setting its price. When there is no valid listino, any qualifying promo
  // wins outright (listino is treated as +Infinity, so this reduces to the
  // same comparison).
  const promoWins =
    cheapest != null && Number(cheapest.promo_net_price) <= listino;

  const ordered = cheapest
    ? [cheapest, ...allOffers.filter((o) => o !== cheapest)]
    : allOffers;

  return {
    // With no valid listino and no winning promo there's nothing to show;
    // fall back to 0 rather than the raw (possibly negative/NaN) net_price.
    effectivePrice: promoWins
      ? Number(cheapest!.promo_net_price)
      : hasListino
        ? rawListino
        : 0,
    source: promoWins ? 'promo' : 'listino',
    offer: promoWins ? cheapest : null,
    hasPromos,
    // Falls back to the promo CODE when the ERP sent no title — see promoLabel.
    promoTitles: ordered.map((o) => promoLabel(o)).filter(Boolean),
  };
}
