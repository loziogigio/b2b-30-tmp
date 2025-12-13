'use client';

import { Address } from '@framework/order/order-static-data';

export default function AddressCard({
  title,
  a,
}: {
  title: string;
  a: Address;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-sm text-gray-600">
        {a.street_address}
        <br />
        {a.city}
        {a.state ? `, ${a.state}` : ''}
        {a.zip ? `, ${a.zip}` : ''}, {a.country}
      </p>
    </div>
  );
}
