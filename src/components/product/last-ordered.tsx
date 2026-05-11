'use client';

import React from 'react';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import type { ErpPriceData } from '@utils/transform/erp-prices';

type Variant = 'card' | 'row' | 'detail';

type Props = {
  lang: string;
  priceData?: Partial<ErpPriceData> | null;
  variant?: Variant;
  className?: string;
};

const VARIANT_CLASSES: Record<
  Variant,
  {
    wrapper: string;
    label: string;
    value: string;
    qty: string;
    qtyValue: string;
  }
> = {
  card: {
    wrapper:
      'flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[10px] sm:text-xs text-gray-600 text-center',
    label: 'font-semibold uppercase tracking-wide text-gray-500',
    value: 'font-semibold text-gray-800',
    qty: 'text-gray-700',
    qtyValue: 'font-semibold text-gray-900',
  },
  row: {
    wrapper: 'flex flex-col items-start sm:items-center gap-0.5',
    label: 'sr-only',
    value: 'text-xs text-gray-700',
    qty: 'text-[11px] text-gray-600',
    qtyValue: 'font-semibold text-gray-900',
  },
  detail: {
    wrapper: 'inline-flex flex-wrap items-baseline gap-x-3 gap-y-1',
    label: 'sr-only',
    value: 'font-semibold text-brand-dark',
    qty: 'text-gray-700',
    qtyValue: 'font-semibold text-brand-dark',
  },
};

/**
 * Renders the customer's last-order info (date + quantity) for a product.
 * Returns null when the customer has never ordered this item.
 *
 * The same content is shown in product cards, list rows, and the detail info
 * block — visual variants only differ in spacing/typography.
 */
export default function LastOrdered({
  lang,
  priceData,
  variant = 'card',
  className,
}: Props) {
  const { t } = useTranslation(lang, 'common');

  if (!priceData?.buy_did) return null;

  const date = priceData.buy_did_last_date;
  const amount = priceData.buy_did_amount;
  const uom = priceData.packaging_option_default?.packaging_uom;
  const hasAmount = amount != null && Number(amount) > 0;
  if (!date && !hasAmount) return null;

  const styles = VARIANT_CLASSES[variant];

  return (
    <div className={cn(styles.wrapper, className)}>
      <span className={styles.label}>{t('text-last-ordered')}</span>
      {date && <span className={styles.value}>{date}</span>}
      {hasAmount && (
        <span className={styles.qty}>
          {t('text-qty-short')}{' '}
          <span className={styles.qtyValue}>{amount}</span>
          {uom ? ` ${uom}` : ''}
        </span>
      )}
    </div>
  );
}
