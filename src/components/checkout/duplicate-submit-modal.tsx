'use client';

import type { DuplicateWarning } from '@/hooks/use-order-submit';

interface DuplicateSubmitModalProps {
  warning: DuplicateWarning;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DuplicateSubmitModal({
  warning,
  isSubmitting,
  onConfirm,
  onCancel,
}: DuplicateSubmitModalProps) {
  // numero_ordine may be NULL if the cart was submitted so recently that the
  // ERP batch hasn't yet promoted stato T→I. Fall back to the cart id so the
  // user sees a sensible reference instead of "null/null/null".
  const hasOrdNum =
    warning.ordini_numero != null &&
    warning.ordini_causale &&
    warning.ordini_anno;
  const orderNumber = hasOrdNum
    ? `${warning.ordini_causale}/${warning.ordini_anno}/${warning.ordini_numero}`
    : `carrello #${warning.erp_cart_id}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl max-w-[560px] w-full shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Ordine già inoltrato
              </h3>
              <p className="text-sm text-gray-600">
                Conferma se vuoi inviare un duplicato
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pt-4 pb-2 text-sm text-gray-700 leading-relaxed">
          Un ordine con lo stesso numero di articoli (
          <strong>{warning.mongo_items_count}</strong>) è già stato inoltrato
          con numero <strong>{orderNumber}</strong>.
          <br />
          <br />
          Se sei sicuro di voler inviare questo ordine comunque, premi{' '}
          <strong>Conferma invio duplicato</strong>. Altrimenti annulla e torna
          al carrello.
        </div>

        {warning.errorMessage && (
          <div className="px-6 pb-3 text-sm text-gray-500">
            {warning.errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="min-h-[72px] px-4 py-3 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 uppercase leading-snug text-center"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="min-h-[72px] px-4 py-3 rounded-lg bg-brand text-sm font-semibold text-white hover:bg-opacity-90 transition-colors disabled:opacity-50 uppercase leading-snug text-center"
          >
            {isSubmitting ? 'Invio in corso...' : 'Conferma invio duplicato'}
          </button>
        </div>
      </div>
    </div>
  );
}
