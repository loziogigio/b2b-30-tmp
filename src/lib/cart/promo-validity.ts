import type { PromoOffer } from '@utils/transform/erp-prices';

/**
 * Promotion validity for the cart price check. Same rule as the Commerce
 * Suite order price gate: valid on every Europe/Rome calendar day from start
 * to end, end day included. Catalog bounds are Rome-midnight instants, so
 * they are compared as Rome calendar days, never as UTC dates.
 */

/** Europe/Rome calendar day (YYYY-MM-DD); plain days pass through; '' when unparseable. */
export function romeCalendarDay(value: Date | string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** True when the offer is enabled and `now` falls within its validity days. */
export function isPromoOfferValid(offer: PromoOffer, now: Date): boolean {
  if (offer.promo_is_active === false) return false;
  const today = romeCalendarDay(now);
  const start = romeCalendarDay(
    offer.promo_start_at || offer.promo_start_date || '',
  );
  const end = romeCalendarDay(offer.promo_end_at || offer.promo_end_date || '');
  if (start && start > today) return false;
  if (end && today > end) return false;
  return true;
}
