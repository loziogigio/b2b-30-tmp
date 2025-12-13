'use client';

import { OrderSummary } from '@framework/order/types-b2b-orders-list';
import { useTranslation } from 'src/app/i18n/client';

type Props = {
  orders: OrderSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  lang?: string;
};

export default function OrdersList({
  orders,
  selectedId,
  onSelect,
  lang = 'it',
}: Props) {
  const { t } = useTranslation(lang, 'common');

  if (!orders.length) {
    return (
      <section className="rounded-2xl bg-white shadow-sm">
        <header className="border-b px-6 py-4">
          <h3 className="text-base font-semibold">{t('orders-title')}</h3>
        </header>
        <div className="p-6 text-sm text-gray-500">{t('orders-no-match')}</div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
      <header className="sticky top-0 z-10 shrink-0 border-b bg-white px-6 py-4">
        <h3 className="text-base font-semibold">{t('orders-title')}</h3>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <ul className="divide-y">
          {orders.map((o) => (
            <li
              key={o.id}
              className={`flex cursor-pointer items-center justify-between gap-4 px-6 py-4 transition ${
                selectedId === o.id ? 'bg-teal-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelect(o.id)}
            >
              <div>
                <p className="text-sm text-gray-500">
                  {t('orders-order-number')} {o.id}
                </p>
                <p className="text-sm font-medium text-gray-900">{o.id}</p>
                <p className="text-xs text-gray-500">
                  {new Date(o.date_label).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{t('orders-total')}</p>
                <p className="font-semibold">{o.ordered_total.toFixed(2)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
