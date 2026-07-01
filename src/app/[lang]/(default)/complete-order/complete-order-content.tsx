'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IoCheckmarkCircle } from 'react-icons/io5';
import Container from '@components/ui/container';
import Divider from '@components/ui/divider';
import { useCart } from '@contexts/cart/cart.context';
import { get as pimGet } from '@framework/utils/httpPIM';
import { CS_CART } from '@framework/utils/api-endpoints-cs';
import { useTranslation } from 'src/app/i18n/client';

const POLL_INTERVAL = 8_000;

export default function CompleteOrderContent({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { resetCart } = useCart();
  const searchParams = useSearchParams();

  const isProcessing = searchParams.get('processing') === 'true';
  const orderId = searchParams.get('order_id');

  const [status, setStatus] = useState<
    'processing' | 'completed' | 'failed' | null
  >(isProcessing ? 'processing' : null);

  useEffect(() => {
    // Landing here means the order was already submitted — clear local cart
    // state only; the server order is finalised and must not be deleted (400).
    resetCart(undefined, { deleteServer: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll processing status
  useEffect(() => {
    if (!isProcessing || !orderId) return;

    let active = true;
    const poll = async () => {
      try {
        const res = await pimGet<any>(CS_CART.PROCESSING_STATUS(orderId));
        if (!active) return;
        if (res.processing_status === 'completed') {
          setStatus('completed');
        } else if (res.processing_status === 'failed') {
          setStatus('failed');
        }
      } catch {
        // ignore polling errors
      }
    };

    poll();
    const interval = setInterval(() => {
      if (status === 'completed' || status === 'failed') return;
      poll();
    }, POLL_INTERVAL);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isProcessing, orderId, status]);

  return (
    <>
      <Divider />
      <Container>
        <div className="py-16 xl:px-32 2xl:px-44 3xl:px-56 lg:py-20">
          {/* Sync success or completed processing */}
          {(!isProcessing || status === 'completed') && (
            <div className="flex items-center justify-start px-4 py-4 text-sm border rounded-md border-border-base bg-fill-secondary lg:px-5 text-brand-dark md:text-base">
              <span className="flex items-center justify-center w-10 h-10 rounded-full ltr:mr-3 rtl:ml-3 lg:ltr:mr-4 lg:rtl:ml-4 bg-brand bg-opacity-20 shrink-0">
                <IoCheckmarkCircle className="w-5 h-5 text-brand" />
              </span>
              {t('text-order-received')}
            </div>
          )}

          {/* Processing in progress */}
          {status === 'processing' && (
            <div className="flex items-center justify-start px-4 py-4 text-sm border rounded-md border-blue-200 bg-blue-50 lg:px-5 text-blue-900 md:text-base">
              <span className="flex items-center justify-center w-10 h-10 rounded-full ltr:mr-3 rtl:ml-3 lg:ltr:mr-4 lg:rtl:ml-4 bg-blue-100 shrink-0">
                <svg
                  className="w-5 h-5 text-blue-600 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity="0.3"
                  />
                  <path
                    d="M12 2a10 10 0 019.95 9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <div>
                <div className="font-semibold">
                  {t('text-order-processing', {
                    defaultValue:
                      'Il tuo ordine è in fase di validazione dal sistema ERP.',
                  })}
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {t('text-order-processing-hint', {
                    defaultValue:
                      'Riceverai una conferma via email al completamento.',
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Processing failed */}
          {status === 'failed' && (
            <div className="flex items-center justify-start px-4 py-4 text-sm border rounded-md border-amber-200 bg-amber-50 lg:px-5 text-amber-900 md:text-base">
              <span className="flex items-center justify-center w-10 h-10 rounded-full ltr:mr-3 rtl:ml-3 lg:ltr:mr-4 lg:rtl:ml-4 bg-amber-100 shrink-0">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-amber-600"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <div>
                <div className="font-semibold">
                  {t('text-order-failed', {
                    defaultValue:
                      "Si sono verificate anomalie durante l'elaborazione.",
                  })}
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  {t('text-order-failed-hint', {
                    defaultValue:
                      'Torna al carrello per verificare e correggere le anomalie.',
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
      <Divider />
    </>
  );
}
