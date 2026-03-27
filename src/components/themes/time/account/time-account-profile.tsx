'use client';

import { useTranslation } from 'src/app/i18n/client';
import {
  useCustomerQuery,
  useAddressQuery,
} from '@framework/acccount/fetch-account';
import { TimeCard, TimeInfoRow } from './time-account-primitives';
import { IconMapPin, IconTruck } from './time-account-icons';

interface TimeAccountProfileProps {
  lang: string;
}

export default function TimeAccountProfile({ lang }: TimeAccountProfileProps) {
  const { t } = useTranslation(lang, 'common');
  const {
    data: customer,
    isLoading: loadingCustomer,
    error: errorCustomer,
  } = useCustomerQuery(true);
  const {
    data: addresses = [],
    isLoading: loadingAddresses,
    error: errorAddresses,
  } = useAddressQuery(true);

  const loading = loadingCustomer || loadingAddresses;
  const error = errorCustomer || errorAddresses;

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <TimeCard className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded bg-[var(--time-gray-100)]" />
            <div className="h-3 w-full rounded bg-[var(--time-gray-100)]" />
            <div className="h-3 w-2/3 rounded bg-[var(--time-gray-100)]" />
            <div className="h-3 w-3/4 rounded bg-[var(--time-gray-100)]" />
          </div>
        </TimeCard>
        <TimeCard className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded bg-[var(--time-gray-100)]" />
            <div className="h-20 w-full rounded bg-[var(--time-gray-100)]" />
          </div>
        </TimeCard>
      </div>
    );
  }

  if (error) {
    return (
      <TimeCard className="p-6">
        <div className="rounded-[var(--radius-btn)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {t('text-something-wrong', { defaultValue: 'Something went wrong' })} —{' '}
          {String(error.message)}
        </div>
      </TimeCard>
    );
  }

  // Split addresses: legal seat vs delivery
  const legalSeat = addresses.find((a) => a.isLegalSeat);
  const deliveryAddresses = addresses.filter((a) => !a.isLegalSeat);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Company Data */}
        <TimeCard className="px-6 py-6">
          <div className="text-[10px] font-bold text-[var(--time-gray-400)] uppercase tracking-[0.08em] font-[var(--font-body)] mb-4">
            {t('GENERAL_INFORMATIONS', { defaultValue: 'Dati Azienda' })}
          </div>
          {customer && (
            <>
              <TimeInfoRow
                label={t('COMPANY_NAME', { defaultValue: 'Ragione Sociale' })}
                value={customer.businessName ?? '—'}
              />
              <TimeInfoRow
                label={t('CUSTOM_CODE', { defaultValue: 'Codice Cliente' })}
                value={customer.code}
                mono
                copyable
              />
              <TimeInfoRow
                label={t('VAT_NUMBER', { defaultValue: 'Partita IVA' })}
                value={customer.vatNumber ?? '—'}
                mono
                copyable
              />
              <TimeInfoRow
                label={t('TAX_CODE', { defaultValue: 'Codice Fiscale' })}
                value={customer.taxCode ?? '—'}
                mono
                copyable
              />
              <TimeInfoRow label="SDI" value={customer.sdi ?? '—'} mono copyable />
              <TimeInfoRow label="PEC" value={customer.pec ?? '—'} copyable />
              {customer.firstName && (
                <TimeInfoRow
                  label={t('FIRST_NAME', { defaultValue: 'Nome' })}
                  value={customer.firstName}
                />
              )}
              {customer.lastName && (
                <TimeInfoRow
                  label={t('SURNAME', { defaultValue: 'Cognome' })}
                  value={customer.lastName}
                />
              )}
              {customer.discountCode && (
                <TimeInfoRow
                  label={t('text-discount-code', { defaultValue: 'Sconto' })}
                  value={customer.discountCode}
                  mono
                />
              )}
            </>
          )}
        </TimeCard>

        {/* Addresses */}
        <TimeCard className="px-6 py-6">
          <div className="text-[10px] font-bold text-[var(--time-gray-400)] uppercase tracking-[0.08em] font-[var(--font-body)] mb-4">
            {t('ADDRESSES', { defaultValue: 'Indirizzi' })}
          </div>

          {legalSeat && (
            <div className="mb-5">
              <div className="text-[11px] font-bold text-[var(--time-dark)] font-[var(--font-body)] mb-1.5 flex items-center gap-1.5">
                <IconMapPin />
                {t('text-billing-address', { defaultValue: 'Indirizzo di Fatturazione' })}
              </div>
              <div className="text-[13px] text-[var(--time-gray-500)] font-[var(--font-body)] bg-[var(--time-gray-50)] p-3 rounded-[var(--radius-btn)]">
                {legalSeat.address.street_address}
                {legalSeat.address.city && `, ${legalSeat.address.city}`}
                {legalSeat.address.zip && ` ${legalSeat.address.zip}`}
                {legalSeat.address.state && ` (${legalSeat.address.state})`}
              </div>
            </div>
          )}

          {deliveryAddresses.length > 0 && (
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-[var(--time-dark)] font-[var(--font-body)] mb-1.5 flex items-center gap-1.5">
                <IconTruck />
                {t('text-shipping-addresses', { defaultValue: 'Indirizzi di Spedizione' })}
              </div>
              {deliveryAddresses.map((addr) => (
                <div
                  key={addr.id}
                  className="text-[13px] text-[var(--time-gray-500)] font-[var(--font-body)] bg-[var(--time-gray-50)] p-3 rounded-[var(--radius-btn)]"
                >
                  <div className="font-semibold text-[var(--time-dark)] text-xs mb-1">
                    {addr.title}
                  </div>
                  {addr.address.street_address}
                  {addr.address.city && `, ${addr.address.city}`}
                  {addr.address.zip && ` ${addr.address.zip}`}
                  {addr.address.state && ` (${addr.address.state})`}
                </div>
              ))}
            </div>
          )}

          {addresses.length === 0 && (
            <div className="text-sm text-[var(--time-gray-400)] p-3 bg-[var(--time-gray-50)] rounded-[var(--radius-btn)]">
              {t('text-no-address-found', { defaultValue: 'Nessun indirizzo trovato' })}
            </div>
          )}
        </TimeCard>
      </div>
    </div>
  );
}
