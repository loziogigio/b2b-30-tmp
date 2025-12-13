'use client';

import { useState } from 'react';
import Button from '@components/ui/button';
import Heading from '@components/ui/heading';
import Contact from '@components/contact/contact';
import Address from './address';
import DeliveryNotes from './delivery-instruction';
import DeliverySchedule from './schedule';
import DeliveryTips from './delivery-tips';
import StripeCheckoutInlineForm from './stripe-checkout-inline-form';
import { useTranslation } from 'src/app/i18n/client';
import { useIsMounted } from '@utils/use-is-mounted';

const CheckoutDetails: React.FC<{ lang: string }> = ({ lang }) => {
  const { t } = useTranslation(lang, 'common');
  const [bindIndex, setBindIndex] = useState(0);

  const data = [
    {
      id: 1,
      title: 'text-delivery-address',
      component: <Address lang={lang} />,
    },
    {
      id: 2,
      title: 'text-delivery-schedule',
      component: <DeliverySchedule lang={lang} />,
    },
    { id: 3, title: 'text-contact-number', component: <Contact lang={lang} /> },
    {
      id: 4,
      title: 'text-payment-option',
      component: <StripeCheckoutInlineForm lang={lang} />,
    },
    {
      id: 5,
      title: 'text-delivery-instructions',
      component: <DeliveryNotes lang={lang} />,
    },
    {
      id: 6,
      title: 'text-delivery-tip',
      component: <DeliveryTips lang={lang} />,
    },
  ];

  const changeItem = (i: number) => i !== bindIndex && setBindIndex(i);
  const mounted = useIsMounted();

  return (
    <div className="rounded-md border border-gray-200 bg-white text-brand-light">
      {mounted &&
        data.map((item, index) => {
          const isOpen = bindIndex === index;
          const isLast = index === data.length - 1;

          return (
            <div
              key={item.id}
              className={!isLast ? 'border-b border-gray-200' : ''}
            >
              {/* header */}
              <button
                onClick={() => changeItem(index)}
                className="flex w-full items-center gap-3 bg-gray-50 px-4 py-3 text-left sm:px-6"
                aria-expanded={isOpen}
                aria-controls={`sec_${index}`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-indigo-600 text-indigo-600 font-semibold">
                  {index + 1}
                </span>
                <Heading className="text-[15px] sm:text-base">
                  {t(item.title)}
                </Heading>
              </button>

              {/* content */}
              <div id={`sec_${index}`} className={isOpen ? 'block' : 'hidden'}>
                <div className="px-5 pb-5 pt-4 sm:px-9 sm:pb-6 sm:pt-5 lg:px-20">
                  <div className="mb-6">{item.component}</div>

                  {!isLast && (
                    <div className="text-right">
                      <Button
                        onClick={() => changeItem(index + 1)}
                        variant="formButton"
                        className="rounded bg-brand px-4 py-3 text-sm font-semibold text-white"
                      >
                        {t('button-next-steps')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default CheckoutDetails;
