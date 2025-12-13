'use client';

import { money } from '@utils/money';
import OrderItemsTable from './order-items-table';
import Link from 'next/link';
import {
  TransformedOrder,
  TransformedOrderItem,
} from '@utils/transform/b2b-order';
import AddressCard from './address-card';
import { useTranslation } from 'src/app/i18n/client';

type Props = {
  order: TransformedOrder | null;
  lang: string; // pass language code here
};

export default function OrderDetails({ order, lang }: Props) {
  const { t } = useTranslation(lang, 'common');

  if (!order) {
    return (
      <section className="rounded-2xl bg-white shadow-sm p-8 text-center text-sm text-gray-500">
        {t('orders-select-order')}
      </section>
    );
  }

  const items: TransformedOrderItem[] =
    (order as any).items ??
    (order as any).products?.map((p: any) => ({
      id: p.id,
      name: p.name,
      image: p.image?.thumbnail || p.image?.original,
      unit: p.unit,
      price: money(p.pivot?.unit_price ?? p.price),
      quantity: Number(p.pivot?.order_quantity ?? 1),
      reviewUrl: '#',
    })) ??
    [];

  return (
    <section className="rounded-2xl bg-white shadow-sm">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">{t('orders-details')}</h2>
          <p className="text-xs text-gray-500">
            {order.cause}/{order.doc_number}/{order.doc_year}
          </p>
        </div>

        <Link
          href={`/${lang}/account/order-detail?cause=${order.cause}&doc_year=${order.doc_year}&doc_number=${order.doc_number}`}
          className="text-sm text-teal-600 hover:underline"
          aria-label={t('orders-view-details')}
        >
          {t('orders-view-details')}
        </Link>
      </header>

      {/* address */}
      <div className="px-6 py-6">
        <AddressCard
          title={t('orders-shipping-address')}
          a={(order as any).shipping_address}
        />
      </div>

      {/* total */}
      <div className="border-t px-6 py-4">
        <div className="flex items-center justify-between text-base">
          <span className="font-medium">{t('orders-total')}</span>
          <span className="font-semibold">
            €{money((order as any).total).toFixed(2)}
          </span>
        </div>
      </div>

      <OrderItemsTable items={items} lang={lang} />
    </section>
  );
}
