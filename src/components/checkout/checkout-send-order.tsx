'use client';

import { useMemo, useState } from 'react';
import cn from 'classnames';
import Button from '@components/ui/button';
import Heading from '@components/ui/heading';
import { useTranslation } from 'src/app/i18n/client';
import { formatAddress } from '@utils/format-address';
import { useDeliveryAddress } from '@contexts/address/address.context';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';
import { useCart } from '@contexts/cart/cart.context';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC } from '@framework/utils/static';

// helpers
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
const nextBusinessDay = (from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  return d;
};
const toLocalISODate = (d: Date) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

type Address = { id: string | number; title: string; address: any };
type SubmitPayload = {
  address: Address;
  paymentTerms?: { code?: string; label?: string };
  date: string;
  notes?: string;
};

type Props = {
  lang: string;
  onSubmit?: (payload: SubmitPayload) => void;
};

function makeTitle(r: AddressB2B | undefined) {
  if (!r) return '';
  const city = r.address?.city ?? '';
  const line1 = r.address?.street_address ?? '';
  return [line1, city].filter(Boolean).join(' - ');
}

export default function CheckoutSendOrder({ lang, onSubmit }: Props) {
  const { t } = useTranslation(lang, 'common');

  // selectedB2B can be AddressB2B | null
  const { selected: selectedB2B } = useDeliveryAddress();

  // Get cart meta for idCart
  const { meta, resetCart } = useCart();

  // map to local Address type (undefined instead of null to avoid TS error)
  const selected: Address | undefined = useMemo(() => {
    if (!selectedB2B) return undefined;
    return {
      id: selectedB2B.id,
      title: makeTitle(selectedB2B),
      address: selectedB2B.address ?? selectedB2B,
    };
  }, [selectedB2B]);

  // read-only payment terms from selected address
  const paymentTerms = selectedB2B?.paymentTerms; // { code, label } | undefined

  // auto-pick first available date (next business day)
  const [date] = useState<string>(() => toLocalISODate(nextBusinessDay()));
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = Boolean(selected && date && !isSubmitting);

  const handleSubmit = async () => {
    if (!canSubmit || !selected) return;

    setIsSubmitting(true);

    try {
      // Build payload matching the expected API format
      const payload = {
        client_id: ERP_STATIC.customer_code,
        address_code: selectedB2B?.id || ERP_STATIC.address_code,
        ext_call: ERP_STATIC.ext_call,
        username: ERP_STATIC.username,
        id_cart: meta?.idCart || ERP_STATIC.id_cart,
        note: notes,
        shipping_date: date,
        transport_cost: 0,
      };

      await post(API_ENDPOINTS_B2B.SEND_ORDER, payload);

      // Call onSubmit callback if provided
      onSubmit?.({
        address: selected,
        paymentTerms,
        date,
        notes,
      });

      // Reset cart after successful order
      await resetCart();

      // Redirect to order confirmation or show success message
      if (typeof window !== 'undefined') {
        window.location.href = `/${lang}/complete-order`;
      }
    } catch (error) {
      console.error('Failed to send order:', error);
      // Optionally show error to user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="px-2">
        <Heading variant="title" className="mb-3">
          {t('text-delivery-address') ?? 'Delivery Address'}
        </Heading>
      </div>

      {/* Address (read-only) */}
      <div className="px-2 pb-3">
        {selected ? (
          <div className="relative rounded-md border-2 border-brand/60 bg-white p-4">
            <div className="mb-1 text-sm font-semibold text-brand-dark">
              {selected.title}
            </div>
            <div className="text-sm text-brand-muted whitespace-pre-line">
              {formatAddress(selected.address)}
            </div>

            {/* Payment terms (read-only, label + code) */}
            {paymentTerms && (paymentTerms.label || paymentTerms.code) && (
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">
                  {t('text-payment-terms') ?? 'Payment terms'}:
                </span>{' '}
                {paymentTerms.label ?? ''}
                {paymentTerms.label && paymentTerms.code ? ' ' : ''}
                {paymentTerms.code ? `(${paymentTerms.code})` : ''}
              </div>
            )}

            {/* Delivery date (read-only, hidden picker) */}
            <div className="mt-1 text-xs text-gray-600">
              <span className="font-medium">
                {t('text-delivery-date') ?? 'Delivery date'}:
              </span>{' '}
              {fmtDate(date)}
            </div>
          </div>
        ) : (
          <div className="min-h-[96px] rounded border-2 border-gray-200 p-5 text-sm font-semibold text-brand-danger">
            {t('text-no-address-found') ?? 'No address found'}
          </div>
        )}
      </div>

      {/* Notes (editable) */}
      <div className="px-2">
        <label className="mb-1 block text-sm text-gray-700">
          {t('text-notes') ?? 'Notes'}
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            t('text-notes-placeholder') ?? 'Add any notes for this order…'
          }
          className="w-full resize-y rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 px-2 pb-2 pt-2">
        <Button
          disabled={!canSubmit}
          loading={isSubmitting}
          onClick={handleSubmit}
          className={cn(
            'rounded bg-brand px-4 py-3 text-sm font-semibold text-white',
            !canSubmit && 'cursor-not-allowed opacity-50',
          )}
        >
          {t('button-send-order', { defaultValue: 'Send Order' })}
        </Button>
      </div>
    </div>
  );
}
