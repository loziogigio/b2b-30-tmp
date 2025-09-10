// @components/account/profile-card.tsx
'use client';

import * as React from 'react';
import { useTranslation } from 'src/app/i18n/client';
import { useCustomerQuery, useAddressQuery } from '@framework/acccount/fetch-account';
import AddressGridB2B from '@components/address/address-grid-b2b'; // <- display-only version
// import { useDeliveryAddress } from '@contexts/address/address.context'; // not needed here

export default function ProfileCard({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const readOnly = true

  const { data: customer, isLoading: loadingCustomer, error: errorCustomer } = useCustomerQuery(true);
  const { data: addresses = [], isLoading: loadingAddresses, error: errorAddresses } = useAddressQuery(true);

  const loading = loadingCustomer || loadingAddresses;
  const error = errorCustomer || errorAddresses;

  return (
    <div className="w-full">
      <div className="rounded-md border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t('GENERAL_INFORMATIONS') ?? 'General Information'}
        </h2>

        {loading && (
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-24 w-full rounded bg-gray-200" />
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {t('text-something-wrong') ?? 'Something went wrong'} — {String(error.message)}
          </div>
        )}

        {!loading && customer && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left: Customer general info */}
            <div>
              <table className="w-full text-sm [&_td]:py-2">
                <tbody>
                  <tr>
                    <td className="w-44 text-gray-500">{t('CUSTOM_CODE') ?? 'Customer Code'}</td>
                    <td className="font-medium text-gray-900">{customer.code}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500">{t('COMPANY_NAME') ?? 'Company Name'}</td>
                    <td className="font-medium text-gray-900">{customer.businessName ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500">{t('SURNAME') ?? 'Surname'}</td>
                    <td className="font-medium text-gray-900">{customer.lastName ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500">{t('FIRST_NAME') ?? 'First Name'}</td>
                    <td className="font-medium text-gray-900">{customer.firstName ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500">{t('TAX_CODE') ?? 'Tax Code'}</td>
                    <td className="font-medium text-gray-900">{customer.taxCode ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500">{t('VAT_NUMBER') ?? 'VAT Number'}</td>
                    <td className="font-medium text-gray-900">{customer.vatNumber ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500">PEC</td>
                    <td className="font-medium text-gray-900">{customer.pec ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500">SDI</td>
                    <td className="font-medium text-gray-900">{customer.sdi ?? '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: All addresses (display-only) */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                {t('ADDRESSES') ?? 'Addresses'}
              </h3>

              {addresses.length > 0 ? (
                <div className="overflow-y-auto pr-1">
                  <AddressGridB2B lang={lang} address={addresses} readOnly={readOnly} />
                </div>
              ) : (
                <div className="rounded-md border border-gray-200 p-3 text-sm text-gray-600">
                  {t('text-no-address-found') ?? 'No addresses found'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
