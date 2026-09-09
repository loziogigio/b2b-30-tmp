// app/[lang]/(modals)/delivery-addresses.tsx
'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import AddressGridB2B from '@components/address/address-grid-b2b';
import { useModalAction } from '@components/common/modal/modal.context';
import CloseButton from '@components/ui/close-button';
import Heading from '@components/ui/heading';
import { useDeliveryAddress } from '@contexts/address/address.context';
import { useAddressQuery } from '@framework/acccount/fetch-account';
import { useTranslation } from 'src/app/i18n/client';
import { filterAddresses } from '@components/address/filter-addresses';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';

const DeliveryAddresses: React.FC<{ lang: string }> = ({ lang }) => {
  const { t } = useTranslation(lang, 'common');
  const { closeModal } = useModalAction();
  const pathname = usePathname();

  // Global delivery-address store
  const { selected, setSelectedAddress } = useDeliveryAddress();

  // Fetch list (already normalized)
  const { data: addresses = [], isLoading, error } = useAddressQuery();

  const [query, setQuery] = React.useState('');
  // Only used for the "n found" hint — the grid gets the full list plus the
  // query and narrows its own render, so filtering can never re-derive which
  // address is selected.
  const matchCount = React.useMemo(
    () => filterAddresses(addresses, query).length,
    [addresses, query],
  );

  // Check if we're on the home page
  const isHomePage = pathname === `/${lang}` || pathname === `/${lang}/`;

  // Helper to handle address selection with page refresh for home page
  const handleAddressChange = React.useCallback(
    (addr: AddressB2B | null, shouldCloseModal = false) => {
      setSelectedAddress(addr);
      if (shouldCloseModal) {
        closeModal();
      }
      // Full page reload after a short delay to ensure cookie is set
      // This is needed because the home page template is server-rendered based on cookie
      if (isHomePage && addr?.address?.state) {
        setTimeout(() => {
          window.location.reload();
        }, 150);
      }
    },
    [setSelectedAddress, closeModal, isHomePage],
  );

  // Auto-select address if none selected OR if current selection is stale (not in API list)
  // (API already sorts default address first)
  React.useEffect(() => {
    if (!addresses.length) return;

    // Check if current selected address exists in the fetched addresses list
    // Use String() conversion to handle different ID types (string/number)
    const selectedIsValid =
      selected &&
      addresses.some((addr) => String(addr.id) === String(selected.id));

    // Select first/default address if no selection or stale selection
    if (!selectedIsValid) {
      const defaultAddress =
        addresses.find((addr) => addr.is_default) || addresses[0];
      handleAddressChange(defaultAddress, false);
    }
  }, [addresses, selected, handleAddressChange]);

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
        <>
          {addresses.length > 1 && (
            <div className="mb-4 flex flex-col gap-1">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('text-search-address')}
                aria-label={t('text-search-address')}
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-80"
              />
              {query.trim() && (
                <span className="text-xs text-gray-500">
                  {t('text-addresses-found', {
                    count: matchCount,
                    defaultValue: '{{count}} indirizzi trovati',
                  })}
                </span>
              )}
            </div>
          )}

          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <AddressGridB2B
              lang={lang}
              address={addresses}
              filterQuery={query}
              initialSelectedId={selected?.id}
              onSelect={(addr?: AddressB2B) => {
                handleAddressChange(addr ?? null, true); // persist + close modal + refresh if on home
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DeliveryAddresses;
