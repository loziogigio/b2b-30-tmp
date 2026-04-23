'use client';

import { useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import Button from '@components/ui/button';
import Heading from '@components/ui/heading';
import { useTranslation } from 'src/app/i18n/client';
import { formatAddress } from '@utils/format-address';
import { useDeliveryAddress } from '@contexts/address/address.context';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';
import { useOrderSubmit } from '@/hooks/use-order-submit';
import AnomalyModal from './anomaly-modal';
import DuplicateSubmitModal from './duplicate-submit-modal';
import OrderAlreadySubmittedModal from './order-already-submitted-modal';
import { useCartAnomalies } from '@/contexts/cart-anomalies.context';

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
  const { selected: selectedB2B } = useDeliveryAddress();
  const {
    submitOrder,
    resubmitWithAutofix,
    confirmDuplicateSubmit,
    isSubmitting,
    anomalyResult,
    duplicateWarning,
    orderAlreadySubmitted,
    submitError,
    clearAnomalies,
    clearDuplicateWarning,
  } = useOrderSubmit(lang);
  const { setAnomalies: setSharedAnomalies } = useCartAnomalies();

  // Push new anomalies into the shared context so the banner above the cart
  // and the per-row red highlighting pick them up. Do NOT mirror nulls — that
  // would wipe the banner the moment the modal is dismissed via clearAnomalies.
  // The shared context is cleared explicitly (dismiss button) or automatically
  // when cart items change (see CheckoutFlowInner).
  useEffect(() => {
    if (anomalyResult) setSharedAnomalies(anomalyResult);
  }, [anomalyResult, setSharedAnomalies]);

  // Closing the Anomaly modal only drops the local modal state; the shared
  // context keeps the banner + red rows visible until the user edits items.
  const handleEditManually = () => {
    clearAnomalies();
  };

  const selected: Address | undefined = useMemo(() => {
    if (!selectedB2B) return undefined;
    return {
      id: selectedB2B.id,
      title: makeTitle(selectedB2B),
      address: selectedB2B.address ?? selectedB2B,
    };
  }, [selectedB2B]);

  const paymentTerms = selectedB2B?.paymentTerms;
  const [date] = useState<string>(() => toLocalISODate(nextBusinessDay()));
  const [notes, setNotes] = useState<string>('');

  const canSubmit = Boolean(selected && date && !isSubmitting);

  const submitOpts = {
    delivery_date: date,
    delivery_type: 'courier',
    notes,
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selected) return;
    const outcome = await submitOrder(submitOpts);
    if (outcome.type === 'success' || outcome.type === 'processing') {
      onSubmit?.({ address: selected, paymentTerms, date, notes });
    }
  };

  return (
    <div className="space-y-4">
      <div className="px-2">
        <Heading variant="title" className="mb-3">
          {t('text-delivery-address') ?? 'Delivery Address'}
        </Heading>
      </div>

      <div className="px-2 pb-3">
        {selected ? (
          <div className="relative rounded-md border-2 border-brand/60 bg-white p-4">
            <div className="mb-1 text-sm font-semibold text-brand-dark">
              {selected.title}
            </div>
            <div className="text-sm text-brand-muted whitespace-pre-line">
              {formatAddress(selected.address)}
            </div>

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

      {submitError &&
        !anomalyResult &&
        !duplicateWarning &&
        !orderAlreadySubmitted && (
          <div className="px-2">
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          </div>
        )}

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

      {anomalyResult && (
        <AnomalyModal
          result={anomalyResult}
          isSubmitting={isSubmitting}
          onAutofix={() => resubmitWithAutofix(submitOpts)}
          onEdit={handleEditManually}
          onClose={handleEditManually}
        />
      )}

      {duplicateWarning && (
        <DuplicateSubmitModal
          warning={duplicateWarning}
          isSubmitting={isSubmitting}
          onConfirm={() => confirmDuplicateSubmit(submitOpts)}
          onCancel={clearDuplicateWarning}
        />
      )}

      {orderAlreadySubmitted && (
        <OrderAlreadySubmittedModal
          message={orderAlreadySubmitted.message}
          onConfirm={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
        />
      )}
    </div>
  );
}
