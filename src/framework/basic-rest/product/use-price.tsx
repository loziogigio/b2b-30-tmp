import { useMemo } from 'react';

export function formatPrice({
  amount,
  currencyCode,
  locale,
  fractionDigits = 2,
}: {
  amount: number;
  currencyCode: string;
  locale: string;
  fractionDigits?: number;
}) {
  const formatCurrency = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return formatCurrency.format(amount);
}

export function formatVariantPrice({
  amount,
  baseAmount,
  currencyCode,
  locale,
  fractionDigits,
}: {
  baseAmount: number;
  amount: number;
  currencyCode: string;
  locale: string;
  fractionDigits?: number;
}) {
  const hasDiscount = baseAmount > amount;
  const formatDiscount = new Intl.NumberFormat(locale, { style: 'percent' });
  const discount = hasDiscount
    ? formatDiscount.format((baseAmount - amount) / baseAmount)
    : null;

  const price = formatPrice({ amount, currencyCode, locale, fractionDigits });
  const basePrice = hasDiscount
    ? formatPrice({ amount: baseAmount, currencyCode, locale, fractionDigits })
    : null;

  return { price, basePrice, discount };
}

export default function usePrice(
  data?: {
    amount: number;
    baseAmount?: number;
    currencyCode: string;
    fractionDigits?: number;
  } | null,
) {
  const { amount, baseAmount, currencyCode, fractionDigits } = data ?? {};
  const locale = 'en';
  const value = useMemo(() => {
    if (typeof amount !== 'number' || !currencyCode) return '';

    return baseAmount
      ? formatVariantPrice({ amount, baseAmount, currencyCode, locale })
      : formatPrice({ amount, currencyCode, locale, fractionDigits });
  }, [amount, baseAmount, currencyCode, fractionDigits]);

  return typeof value === 'string'
    ? { price: value, basePrice: null, discount: null }
    : value;
}
