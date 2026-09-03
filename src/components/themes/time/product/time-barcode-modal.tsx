'use client';

import React from 'react';
import { IoClose, IoDownloadOutline } from 'react-icons/io5';
import {
  useModalState,
  useModalAction,
} from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import {
  BARCODE_WIDTH_MM,
  downloadBarcodeJpeg,
  downloadBarcodePdf,
  renderBarcodeCanvas,
} from '@framework/product/barcode-image';

export type TimeBarcodeModalData = {
  sku?: string;
  ean?: string;
};

/**
 * The barcode on its own — the time theme's alternative to the shelf label.
 *
 * Renders ONLY the bars and their human-readable number: no product name, no
 * article-code line, no label frame. Tenants on this theme want to scan or
 * reprint a code, not dress a shelf edge.
 *
 * The preview is the SAME canvas the downloads are rendered from, so what the
 * user sees is exactly what they get.
 */
export default function TimeBarcodeModal({ lang }: { lang: string }) {
  const { data } = useModalState();
  const { closeModal } = useModalAction();
  const { t } = useTranslation(lang, 'common');

  const { sku = '', ean = '' } = (data ?? {}) as TimeBarcodeModalData;

  // PNG for the on-screen preview: lossless, and the browser scales it down.
  const previewSrc = React.useMemo(() => {
    const canvas = renderBarcodeCanvas(ean);
    return canvas ? canvas.toDataURL('image/png') : '';
  }, [ean]);

  const [failed, setFailed] = React.useState(false);

  const handleDownload = (format: 'jpeg' | 'pdf') => {
    const ok =
      format === 'jpeg'
        ? downloadBarcodeJpeg({ sku, ean })
        : downloadBarcodePdf({ sku, ean });
    if (!ok) setFailed(true);
  };

  const title = t('text-barcode', { defaultValue: 'Codice a barre' });
  const failure = t('text-barcode-failed', {
    defaultValue: 'Impossibile generare il codice a barre per questo prodotto.',
  });

  return (
    <div className="w-full sm:w-[460px] max-w-[92vw] overflow-hidden rounded-2xl bg-white shadow-2xl ltr:text-left rtl:text-right font-[family-name:var(--font-body)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--time-gray-200)] px-5 py-4">
        <span className="text-sm font-bold text-[var(--time-gray-900)] sm:text-base">
          {title}
        </span>
        <button
          type="button"
          onClick={closeModal}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--time-gray-200)] px-3 py-1.5 text-xs font-bold text-[var(--time-gray-600)] transition-colors hover:bg-[var(--time-gray-100)]"
        >
          <IoClose className="h-4 w-4" />
          {t('text-close', { defaultValue: 'Chiudi' })}
        </button>
      </div>

      {previewSrc ? (
        <>
          <div className="flex justify-center bg-[var(--time-gray-100)] px-5 py-6">
            <img
              src={previewSrc}
              alt={title}
              className="w-full max-w-[320px] rounded-md border border-[var(--time-gray-200)] bg-white p-3 shadow-sm"
            />
          </div>

          <div className="space-y-3 px-5 py-4">
            {/* The JPEG carries no DPI metadata, so a viewer printing it "at
                100%" assumes 96dpi and enlarges it. Say which file is true size. */}
            <p className="text-center text-[11px] text-[var(--time-gray-600)]">
              {t('text-barcode-note', {
                defaultValue:
                  'Il PDF stampa a dimensione reale (larghezza {{width}} mm).',
                width: BARCODE_WIDTH_MM,
              })}
            </p>

            {failed && (
              <p className="text-center text-xs font-medium text-red-600">
                {failure}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => handleDownload('jpeg')}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[9px] border-[1.5px] border-[var(--time-gray-200)] px-4 py-2.5 text-sm font-semibold text-[var(--time-gray-600)] transition-colors hover:border-[var(--time-gray-400)]"
              >
                <IoDownloadOutline className="h-4 w-4" />
                {t('text-download-jpeg', { defaultValue: 'Scarica JPEG' })}
              </button>
              <button
                type="button"
                onClick={() => handleDownload('pdf')}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[9px] bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand/90"
              >
                <IoDownloadOutline className="h-4 w-4" />
                {t('text-download-pdf', { defaultValue: 'Scarica PDF' })}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-[var(--time-gray-600)]">
          {failure}
        </p>
      )}
    </div>
  );
}
