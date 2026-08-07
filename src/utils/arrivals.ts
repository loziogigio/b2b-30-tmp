/**
 * Incoming supplier deliveries ("quando arriva?"), shown when an item is out of
 * stock.
 *
 * Every date here is a plain `YYYY-MM-DD` calendar string and STAYS one. It is
 * never turned into a `Date` and back: `new Date('2026-08-30')` parses as UTC
 * midnight, so any negative-offset locale renders it as the 29th. The producing
 * side already formats with Postgres `to_char` for exactly this reason — the
 * string must survive the whole way to the screen.
 */

export type ArrivalDisplay = 'week' | 'date';

export interface ProductArrival {
  eta?: string;
  qty?: number;
}

/** Coerce an unknown value to an ArrivalDisplay, falling back to the default. */
export function asArrivalDisplay(v: unknown): ArrivalDisplay {
  return v === 'date' ? 'date' : 'week';
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today as `YYYY-MM-DD` in the viewer's own timezone. */
export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The first delivery that has not already happened.
 *
 * The importer writes the list ascending, but this does not rely on that: a
 * mis-sorted payload would otherwise show a later date than the true next one.
 * Dates already past are skipped, so a stale sync degrades to showing nothing
 * rather than promising a delivery that was due last week.
 */
export function pickNextArrival(
  arrivals: unknown,
  today: string = todayIsoDate(),
): ProductArrival | null {
  if (!Array.isArray(arrivals)) return null;

  let next: ProductArrival | null = null;
  for (const entry of arrivals) {
    const eta = (entry as ProductArrival)?.eta;
    if (typeof eta !== 'string' || !ISO_DATE.test(eta)) continue;
    // Lexicographic comparison is exact for zero-padded YYYY-MM-DD.
    if (eta < today) continue;
    if (!next || eta < (next.eta as string)) next = entry as ProductArrival;
  }
  return next;
}

/**
 * ISO-8601 week number: weeks start Monday, and week 1 is the one containing
 * the first Thursday of the year. Computed from the date parts so no timezone
 * is involved.
 */
export function isoWeekNumber(isoDate: string): number | null {
  const match = ISO_DATE.exec(isoDate);
  if (!match) return null;

  const [, year, month, day] = match;
  // UTC throughout: this Date is arithmetic, never formatted or localised.
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  // Shift to the Thursday of the same ISO week, which always sits in the ISO year.
  const dayOfWeek = date.getUTCDay() || 7; // Sunday 0 → 7
  date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);

  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const days = (date.getTime() - yearStart) / 86400000;

  return Math.floor(days / 7) + 1;
}

/** `2026-08-30` → `30/08/2026`, by string surgery only. */
export function formatIsoDateDisplay(isoDate: string): string | null {
  const match = ISO_DATE.exec(isoDate);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** `30/08/2026` → `2026-08-30`. Returns null for anything else. */
export function dmyToIso(value: string | undefined): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '');
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

/**
 * Next supplier arrival according to the ERP.
 *
 * The ERP path predates the PIM one and carries its own shape: a list under
 * `product_label_action.order_supplier_available` (with two legacy misspellings
 * at the top level), dates in either dd/mm/yyyy or ISO, under four possible
 * field names, plus a supplier-stated week number that we prefer over a
 * computed one.
 */
export function pickErpArrival(
  priceData: any,
  today: string = todayIsoDate(),
): { eta: string; week?: number } | null {
  const rows: any[] =
    priceData?.product_label_action?.order_supplier_available ??
    priceData?.order_supplier_available ??
    priceData?.order_suplier_available ??
    [];
  if (!Array.isArray(rows)) return null;

  let best: { eta: string; week?: number } | null = null;
  for (const row of rows) {
    const raw =
      row?.expected_date ??
      row?.confirmed_date ??
      row?.DataArrivoPrevista ??
      row?.DataArrivoConfermata;
    if (typeof raw !== 'string') continue;

    const eta = ISO_DATE.test(raw) ? raw : dmyToIso(raw);
    if (!eta || eta < today) continue;

    if (!best || eta < best.eta) {
      const week = Number(row?.NumeroDellaSettimana);
      best = {
        eta,
        week: Number.isFinite(week) && week > 0 ? week : undefined,
      };
    }
  }
  return best;
}

/**
 * The value to put after "In arrivo" — a week number or an exact date,
 * depending on the channel's `arrival_display` setting. Returns null when there
 * is nothing to say, so callers can render nothing at all.
 */
export function formatArrival(
  arrivals: unknown,
  mode: ArrivalDisplay,
  today: string = todayIsoDate(),
  erpPriceData?: any,
): { mode: ArrivalDisplay; week?: number; date?: string } | null {
  // The ERP wins when it has something: its dates are supplier-confirmed order
  // lines for THIS customer, and it states the delivery week itself rather than
  // leaving us to derive one. The PIM list is the fallback for tenants on
  // inline pricing, which have no ERP to ask.
  const erp = pickErpArrival(erpPriceData, today);
  const next = erp ?? pickNextArrival(arrivals, today);
  if (!next?.eta) return null;

  if (mode === 'date') {
    const date = formatIsoDateDisplay(next.eta);
    return date ? { mode: 'date', date } : null;
  }

  const week = erp?.week ?? isoWeekNumber(next.eta);
  return week ? { mode: 'week', week } : null;
}
