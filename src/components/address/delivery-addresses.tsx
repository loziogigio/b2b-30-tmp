// app/[lang]/(modals)/delivery-addresses.tsx
'use client';

import * as React from 'react';
import AddressGridB2B from '@components/address/address-grid-b2b';
import { useModalAction } from '@components/common/modal/modal.context';
import CloseButton from '@components/ui/close-button';
import Heading from '@components/ui/heading';
import { useDeliveryAddress } from '@contexts/address/address.context';
import { useAddressQuery } from '@framework/acccount/fetch-account';
import { useTranslation } from 'src/app/i18n/client';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';

const DeliveryAddresses: React.FC<{ lang: string }> = ({ lang }) => {
  const { t } = useTranslation(lang, 'common');
  const { closeModal } = useModalAction();

  // Global delivery-address store
  const { selected, setSelectedAddress } = useDeliveryAddress();

  // Fetch list (already normalized)
  const { data: addresses = [], isLoading, error } = useAddressQuery();

  // Choose a sensible default if nothing is selected yet
  React.useEffect(() => {
    if (!addresses.length) return;
    if (!selected) {
      const fallback =
        addresses.find(a => a.isLegalSeat) ??
        addresses[0];
      setSelectedAddress(fallback);
    }
  }, [addresses, selected, setSelectedAddress]);

  // Render
  return (
    <div className="max-w-[860px] bg-brand-light p-5 sm:p-8 md:p-10 border border-border-base rounded-md relative">
      <CloseButton onClick={closeModal} />

      <Heading variant="title" className="mb-5 md:mb-8 md:-mt-1.5">
        {t('text-delivery-address')}
      </Heading>

      {/* Loading / Error */}
      {isLoading && (
        <div className="rounded-md border bg-white p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-20 w-full rounded bg-gray-200" />
            <div className="h-20 w-full rounded bg-gray-200" />
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-md border bg-red-50 p-4 text-sm text-red-700">
          {t('text-something-wrong')} — {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && (
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <AddressGridB2B
            lang={lang}
            address={addresses}
            initialSelectedId={selected?.id}
            onSelect={(addr?: AddressB2B) => {
              setSelectedAddress(addr ?? null); // ✅ persist in context (and localStorage via provider)
              closeModal();                      // optional: close after choosing
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DeliveryAddresses;
