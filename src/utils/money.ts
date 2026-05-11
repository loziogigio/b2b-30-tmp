// utils/money.ts
export function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Tenant `priceDecimals` only takes a handful of distinct values (2/3/4), so
// caching by decimals keeps the map bounded and avoids re-allocating a
// NumberFormat on every product card render.
const priceFormatterCache = new Map<number, Intl.NumberFormat>();

function getPriceFormatter(decimals: number): Intl.NumberFormat {
  let fmt = priceFormatterCache.get(decimals);
  if (!fmt) {
    fmt = new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    priceFormatterCache.set(decimals, fmt);
  }
  return fmt;
}

/** Italian-locale number formatter (e.g. 1530 → "1.530,00"). */
export function formatPriceIt(
  value: unknown,
  decimals = 2,
  fallback = '',
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return getPriceFormatter(decimals).format(n);
}
