'use client';

import { useState } from 'react';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5'; // ✅ already available
import CheckoutDetails from '@components/checkout/checkout-details';

export default function CheckoutDetailsWrapper({ lang }: { lang: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8 border-t border-gray-200 pt-4">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100"
      >
        <span>Checkout Details</span>
        {open ? (
          <IoChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <IoChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="mt-4 px-2 sm:px-4">
          <CheckoutDetails lang={lang} />
        </div>
      )}
    </div>
  );
}
