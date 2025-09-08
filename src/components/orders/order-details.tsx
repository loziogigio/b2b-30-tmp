import { money } from '@utils/money';
import OrderProgress from './order-progress';
import OrderItemsTable from './order-items-table';
import Link from 'next/link';
import { TransformedOrder, TransformedOrderItem } from '@utils/transform/b2b-order';
import AddressCard from './address-card';

type Props = { 
  order: TransformedOrder | null;
  lang: string; // pass language code here
};

export default function OrderDetails({ order, lang }: Props) {
  if (!order) {
    return (
      <section className="rounded-2xl bg-white shadow-sm p-8 text-center text-sm text-gray-500">
        Select an order to view details.
      </section>
    );
  }

  const status =
    (order as any).order_status ??
    (order as any).status ??
    'completed';

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
          <h2 className="text-lg font-semibold">Order Details</h2>
          <p className="text-xs text-gray-500">{(order as any).tracking_number ?? (order as any).number}</p>
        </div>

        <Link
          href={`/${lang}/account/order-detail?cause=${order.cause}&doc_year=${order.doc_year}&doc_number=${order.doc_number}`}
          className="text-sm text-teal-600 hover:underline"
          aria-label={`View order details`}
        >
          Details
        </Link>
      </header>

      {/* addresses */}
      <div className="grid gap-6 px-6 py-6 lg:grid-cols-2">
        <AddressCard title="Shipping Address" a={(order as any).shipping_address} />
        <AddressCard title="Billing Address" a={(order as any).billing_address} />
      </div>

      {/* summary */}
      <div className="border-t px-6 py-4">
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-gray-500">Sub Total</span>
          <span className="text-right">${money((order as any).sub_total).toFixed(2)}</span>

          <span className="text-gray-500">Discount</span>
          <span className="text-right">${money((order as any).discount).toFixed(2)}</span>

          <span className="text-gray-500">Delivery Fee</span>
          <span className="text-right">${money((order as any).delivery_fee).toFixed(2)}</span>

          <span className="text-gray-500">Tax</span>
          <span className="text-right">${money((order as any).tax).toFixed(2)}</span>

          <div className="col-span-2 mt-2 border-t pt-3">
            <div className="flex items-center justify-between text-base">
              <span className="font-medium">Total</span>
              <span className="font-semibold">${money((order as any).total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t">
        <OrderProgress status={status} />
      </div>

      <OrderItemsTable items={items} />
    </section>
  );
}
