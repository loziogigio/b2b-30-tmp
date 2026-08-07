'use client';

import React from 'react';
import { IoClose, IoDownloadOutline } from 'react-icons/io5';
import {
  useModalState,
  useModalAction,
} from '@components/common/modal/modal.context';
import { useTranslation } from 'src/app/i18n/client';
import {
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  downloadShelfLabelJpeg,
  downloadShelfLabelPdf,
  renderShelfLabelCanvas,
} from '@framework/product/shelf-label';

export type ShelfLabelModalData = {
  name?: string;
  sku?: string;
  ean?: string;
};

/**
 * Shelf-label preview with the two download formats.
 *
 * The preview is the SAME canvas the downloads are rendered from, so what the
 * user sees is exactly what they get — no second layout to drift.
 */
export default function ShelfLabelModal({ lang }: { lang: string }) {
  const { data } = useModalState();
  const { closeModal } = useModalAction();
  const { t } = useTranslation(lang, 'common');

  const { name = '', sku = '', ean = '' } = (data ?? {}) as ShelfLabelModalData;
  const input = { name, sku, ean };

  // PNG for the on-screen preview: lossless, and the browser scales it down.
  const previewSrc = React.useMemo(() => {
    const canvas = renderShelfLabelCanvas(input);
    return canvas ? canvas.toDataURL('image/png') : '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, sku, ean]);

  const [failed, setFailed] = React.useState(false);

  const handleDownload = (format: 'jpeg' | 'pdf') => {
    const ok =
      format === 'jpeg'
        ? downloadShelfLabelJpeg(input)
        : downloadShelfLabelPdf(input);
    if (!ok) setFailed(true);
  };

  return (
    <div className="w-full sm:w-[460px] max-w-[92vw] overflow-hidden rounded-2xl bg-white shadow-2xl ltr:text-left rtl:text-right">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <span className="text-sm font-bold text-brand-dark sm:text-base">
          {t('text-shelf-label', { defaultValue: 'Etichetta scaffale' })}
        </span>
        <button
          type="button"
          onClick={closeModal}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-brand-dark transition-colors hover:bg-slate-50"
        >
          <IoClose className="h-4 w-4" />
          {t('text-close', { defaultValue: 'Chiudi' })}
        </button>
      </div>

      {previewSrc ? (
        <>
          {/* Preview — rendered from the same canvas the downloads use */}
          <div className="flex justify-center bg-slate-50 px-5 py-6">
            <img
              src={previewSrc}
              alt={t('text-shelf-label', {
                defaultValue: 'Etichetta scaffale',
              })}
              className="w-full max-w-[320px] rounded-md border border-slate-200 bg-white shadow-sm"
            />
          </div>

          <div className="space-y-3 px-5 py-4">
            {/* The JPEG carries no DPI metadata, so a viewer printing it "at
                100%" assumes 96dpi and enlarges it. Say which file is true size. */}
            <p className="text-center text-[11px] text-slate-500">
              {t('text-shelf-label-note', {
                defaultValue:
                  'Il PDF stampa a dimensione reale ({{width}}×{{height}} mm).',
                width: LABEL_WIDTH_MM,
                height: LABEL_HEIGHT_MM,
              })}
            </p>

            {failed && (
              <p className="text-center text-xs font-medium text-red-600">
                {t('text-shelf-label-failed', {
                  defaultValue:
                    "Impossibile generare l'etichetta per questo prodotto.",
                })}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => handleDownload('jpeg')}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-brand-dark transition-colors hover:border-brand hover:text-brand"
              >
                <IoDownloadOutline className="h-4 w-4" />
                {t('text-download-jpeg', { defaultValue: 'Scarica JPEG' })}
              </button>
              <button
                type="button"
                onClick={() => handleDownload('pdf')}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-brand-light transition-all hover:bg-brand/90"
              >
                <IoDownloadOutline className="h-4 w-4" />
                {t('text-download-pdf', { defaultValue: 'Scarica PDF' })}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-slate-600">
          {t('text-shelf-label-failed', {
            defaultValue:
              "Impossibile generare l'etichetta per questo prodotto.",
          })}
        </p>
      )}
    </div>
  );
}
