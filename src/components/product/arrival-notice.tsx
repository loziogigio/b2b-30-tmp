'use client';

import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import { useCatalogSettings } from '@/hooks/use-catalog-settings';
import { formatArrival } from '@utils/arrivals';

interface Props {
  lang: string;
  /** The product's `arrivals` array, straight off the search payload. */
  arrivals: unknown;
  /**
   * Resolved stock for this product. The notice answers "when is it coming
   * back?", so it is shown ONLY when there is nothing on the shelf.
   */
  availability: number | undefined;
  /** ERP price payload, when the tenant has one. Takes priority over `arrivals`. */
  erpPriceData?: any;
  className?: string;
}

/**
 * "In arrivo settimana 36" / "In arrivo il 30/08/2026" for an out-of-stock item.
 *
 * Renders nothing at all when the item is in stock, when it has no incoming
 * deliveries, or when every known delivery date is already in the past — the
 * last case being what a stale importer run looks like, where silence is the
 * only honest output.
 */
/**
 * The "In arrivo …" string, or null when there is nothing to say.
 *
 * Shared so the card badge and the detail-page table row cannot drift: the
 * detail page needs to know whether a label exists *before* it decides to draw
 * the surrounding row, which a component returning null cannot tell it.
 */
export function useArrivalLabel(
  lang: string,
  arrivals: unknown,
  availability: number | undefined,
  /** ERP price payload, when the tenant has one. Takes priority over `arrivals`. */
  erpPriceData?: any,
): string | null {
  const { t } = useTranslation(lang, 'common');
  const { settings } = useCatalogSettings();

  if (typeof availability === 'number' && availability > 0) return null;

  const arrival = formatArrival(
    arrivals,
    settings.arrivalDisplay,
    undefined,
    erpPriceData,
  );
  if (!arrival) return null;

  return arrival.mode === 'week'
    ? t('text-arriving-week', {
        defaultValue: 'In arrivo settimana {{week}}',
        week: arrival.week,
      })
    : t('text-arriving-date', {
        defaultValue: 'In arrivo il {{date}}',
        date: arrival.date,
      });
}

export default function ArrivalNotice({
  lang,
  arrivals,
  availability,
  erpPriceData,
  className,
}: Props) {
  const label = useArrivalLabel(lang, arrivals, availability, erpPriceData);
  if (!label) return null;

  return (
    <span className={cn('vinc-arrival', className)} title={label}>
      {label}
    </span>
  );
}
