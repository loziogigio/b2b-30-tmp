import type { ErpPriceData } from '@utils/transform/erp-prices';
import type { AvailabilityDisplay } from '@/lib/erp/catalog-config.types';

/** Minimal i18n translator shape (matches react-i18next's `t`). */
type TFn = (key: string, opts?: { defaultValue?: string }) => string;

export interface TimeAvailability {
  /** Whether the product is in stock (avail > 0) — drives the pill colour. */
  ok: boolean;
  /** The label to render in the availability pill. */
  label: string;
}

/**
 * Single source of truth for the time-theme availability pill. Mirrors the
 * binary in/out behaviour by default; when the channel's `catalog_settings`
 * sets `availability_display: 'exact'`, the in-stock label gains the real stock
 * quantity with its dynamic UOM (e.g. "Disponibile · 47 PA"). The UOM comes from
 * the product's default packaging option and is omitted when absent — never
 * hardcoded. Out-of-stock always shows the ERP action label (falling back to
 * the generic "Non disponibile") regardless of mode.
 */
export function formatTimeAvailability(
  priceData: ErpPriceData | null | undefined,
  mode: AvailabilityDisplay,
  t: TFn,
): TimeAvailability {
  const avail = priceData ? Number(priceData.availability) : 0;

  // A tenant opts into a dot-only pill by clearing that case's label in
  // `erp_settings`. Every pill surface renders a coloured dot next to the text,
  // so an empty label leaves just the dot. This is deliberately NOT the same as
  // a MISSING `product_label_action` (no ERP data resolved yet), which keeps its
  // fallback text — otherwise a product awaiting pricing would silently lose it.
  const action = priceData?.product_label_action;
  const labelBlanked =
    typeof action?.LABEL === 'string' && action.LABEL.trim() === '';

  if (!(avail > 0)) {
    if (labelBlanked) return { ok: false, label: '' };
    return {
      ok: false,
      label:
        action?.LABEL ||
        t('text-out-stock', { defaultValue: 'Non disponibile' }),
    };
  }

  const uom = priceData?.packaging_option_default?.packaging_uom?.trim();
  const qty = uom ? `${avail} ${uom}` : `${avail}`;

  // Blanked in-stock label: drop the word but keep the quantity when the channel
  // asked for `exact`, so turning the pill into a dot does not also throw away
  // the stock figure the tenant deliberately switched on.
  if (labelBlanked) {
    return { ok: true, label: mode === 'exact' ? qty : '' };
  }

  const inStock = t('text-in-stock', { defaultValue: 'Disponibile' });
  if (mode !== 'exact') {
    return { ok: true, label: inStock };
  }

  return { ok: true, label: `${inStock} · ${qty}` };
}
