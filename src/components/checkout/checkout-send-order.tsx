'use client';

import { useMemo, useState, useEffect } from 'react';
import { RadioGroup, Radio, Label, Description } from '@headlessui/react';
import cn from 'classnames';
import Button from '@components/ui/button';
import Heading from '@components/ui/heading';
import { useTranslation } from 'src/app/i18n/client';
import { formatAddress } from '@utils/format-address';
import { useAddressQuery } from '@framework/address/address';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import { Popover, Transition, Portal } from '@headlessui/react';

import { Fragment } from 'react';
import { it } from 'date-fns/locale';



// ---- types ----
type Address = {
  id: string | number;
  title: string;
  address: any; // whatever your formatAddress expects
};

type Props = {
  lang: string;
  addresses?: Address[]; // pass user addresses here
  onSubmit?: (payload: { address: Address; terms: number; date: string }) => void;
};

// ---- helpers ----
const fmtDate = (value: string) => {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

// import { it } from 'date-fns/locale';

// ---- helpers (add these next to your helpers) ----
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

const nextBusinessDay = (from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  return d;
};

// convert Date → local YYYY-MM-DD (not UTC)
const toLocalISODate = (d: Date) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

const tomorrowNonWeekendISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

// ---- UI ----
export default function CheckoutSendOrder({ lang, addresses = [], onSubmit }: Props) {
  let { data, isLoading } = useAddressQuery();
  const { t } = useTranslation(lang, 'common');

  addresses = data?.data || [];

  // selections
  const [address, setAddress] = useState<Address | null>(addresses[0] ?? null);
  const [terms, setTerms] = useState<number | null>(null); // 30/60/90
  const [date, setDate] = useState<string>('');

  // validation
  const [dateError, setDateError] = useState<string>('');

  // min date = tomorrow, skip weekends
  const minDateISO = useMemo(tomorrowNonWeekendISO, []);
  useEffect(() => {
    // if prefilled date is weekend, clear it
    if (date) {
      const d = new Date(date);
      if (isWeekend(d)) {
        setDate('');
        setDateError(t('text-invalid-date') ?? 'Invalid date');
      } else {
        setDateError('');
      }
    }
  }, [date, t]);

  const canSubmit = Boolean(address && terms && date && !dateError);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({ address: address as Address, terms: terms as number, date });
  };

  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
  const nextBusinessDay = (from = new Date()) => {
    const d = new Date(from);
    d.setDate(d.getDate() + 1);
    while (isWeekend(d)) d.setDate(d.getDate() + 1);
    return d;
  };
  const toLocalISODate = (d: Date) => {
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tz).toISOString().slice(0, 10);
  };


  return (
    <div className="space-y-4">
      {/* Address + terms + delivery date */}
      <div className="px-2 pb-5 pt-4 sm:px-2 sm:pb-6 sm:pt-5">
        {addresses.length ? (
          <RadioGroup value={address} onChange={setAddress} className="grid gap-4 sm:grid-cols-2">
            <Label className="sr-only">{t('address') ?? 'Address'}</Label>
            {addresses.map((item) => (
              <Radio
                key={item.id}
                value={item}
                className={({ checked }) =>
                  cn(
                    'relative block cursor-pointer rounded-md border-2 p-4 min-h-[112px]',
                    checked ? 'border-brand' : 'border-gray-200',
                  )
                }
              >
                <Label as="h3" className="mb-1 font-semibold text-brand-dark">
                  {item.title}
                </Label>
                <Description className="leading-6 text-brand-muted">
                  {formatAddress(item.address)}
                </Description>
                {/* action icons intentionally removed (no “add new address”) */}
              </Radio>
            ))}
          </RadioGroup>
        ) : (
          <div className="min-h-[112px] rounded border-2 border-gray-200 p-5 text-sm font-semibold text-brand-danger">
            {t('text-no-address-found')}
          </div>
        )}

        {/* summary */}
        {address && (
          <div className="mt-3 text-sm text-gray-600">
            <span className="font-medium">{t('text-selected') ?? 'Selected'}:</span>{' '}
            {address.title} — {formatAddress(address.address)}
          </div>
        )}

        <RadioGroup value={terms} onChange={setTerms} className="grid grid-cols-3 gap-3 max-w-md pt-4">
          {[30, 60, 90].map((days) => (
            <Radio
              key={days}
              value={days}
              className={({ checked }) =>
                cn(
                  'flex h-12 items-center justify-center rounded-md border px-4 text-sm font-semibold',
                  checked ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-gray-300 text-gray-700',
                )
              }
            >
              NET {days}
            </Radio>
          ))}
        </RadioGroup>
        {/* Delivery date */}
        <div className="flex flex-col gap-2 pt-4">
          <label className="text-sm text-gray-700">{t('text-delivery-date') ?? 'Delivery date'}</label>

          <Popover className="relative w-full max-w-xs">
            {({ open, close }) => (
              <>
                {/* Readonly input that opens the calendar */}
                <Popover.Button
                  className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {date ? fmtDate(date) : (t('text-delivery-date') ?? 'Delivery date')}
                </Popover.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Portal>
                    <Popover.Panel
                      anchor="bottom start"                           // position relative to the button
                      className="z-50 mt-2 rounded-md border border-gray-200 bg-white p-2 shadow-lg"
                    >
                      <DayPicker
                        mode="single"
                        selected={date ? new Date(date) : undefined}
                        onSelect={(d) => {
                          if (!d) {
                            setDate('');
                            setDateError('');
                            return;
                          }
                          if (isWeekend(d)) {
                            setDate('');
                            setDateError(t('text-no-weekends') ?? 'Weekends are not allowed');
                            return;
                          }
                          const min = nextBusinessDay();
                          const dLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                          const minLocal = new Date(min.getFullYear(), min.getMonth(), min.getDate());
                          if (dLocal < minLocal) {
                            setDate('');
                            setDateError(
                              t('text-minimum-next-day') ??
                              `Earliest available date is ${fmtDate(toLocalISODate(min))} (no weekends).`
                            );
                            return;
                          }
                          setDate(toLocalISODate(d));
                          setDateError('');
                          close();
                        }}
                        disabled={[{ dayOfWeek: [0, 6] }, { before: nextBusinessDay() }]}
                        captionLayout="dropdown"
                        fromDate={new Date()}
                        locale={it}
                        showOutsideDays
                        fixedWeeks
                      />
                    </Popover.Panel>
                  </Portal>
                </Transition>

              </>
            )}
          </Popover>

          {dateError ? (
            <div className="mt-1 text-sm text-red-600">{dateError}</div>
          ) : date ? (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">{t('text-selected') ?? 'Selected'}:</span> {fmtDate(date)}
            </div>
          ) : (
            <div className="mt-1 text-xs text-gray-500">
              {t('text-minimum-next-day') ??
                `Earliest available date is ${fmtDate(toLocalISODate(nextBusinessDay()))} (no weekends).`}
            </div>
          )}
        </div>

      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={cn(
            'rounded bg-brand px-4 py-3 text-sm font-semibold text-white',
            !canSubmit && 'opacity-50 cursor-not-allowed',
          )}
        >
          {t('button-send-order') ?? 'Send Order'}
        </Button>
      </div>
    </div>
  );
}
