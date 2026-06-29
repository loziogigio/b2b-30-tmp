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

  if (!(avail > 0)) {
    return {
      ok: false,
      label:
        priceData?.product_label_action?.LABEL ||
        t('text-out-stock', { defaultValue: 'Non disponibile' }),
    };
  }

  const inStock = t('text-in-stock', { defaultValue: 'Disponibile' });
  if (mode !== 'exact') {
    return { ok: true, label: inStock };
  }

  const uom = priceData?.packaging_option_default?.packaging_uom?.trim();
  return {
    ok: true,
    label: uom ? `${inStock} · ${avail} ${uom}` : `${inStock} · ${avail}`,
  };
}
