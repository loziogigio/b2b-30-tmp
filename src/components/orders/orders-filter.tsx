'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'src/app/i18n/client';

type DestinationOption = { value: string; label: string };

// helpers
function toInputDate(d: Date) {
  // yyyy-mm-dd for <input type="date">
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toErpDate(input: string) {
  // from yyyy-mm-dd -> DDMMYYYY
  if (!input) return '';
  const [y, m, d] = input.split('-');
  return `${d}${m}${y}`;
}
function lastMonthRange() {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - 30);
  return { from: toInputDate(start), to: toInputDate(today) };
}

type Props = {
  // pass available destinations (addresses) from your profile API if you have them
  destinations?: DestinationOption[];
  // initial values (optional)
  initial?: {
    from?: string; // yyyy-mm-dd
    to?: string; // yyyy-mm-dd
    type?: 'T' | 'NE' | 'E' | 'IA';
    address_code?: string;
  };
  // called when user presses "Search"
  onApply: (payload: {
    date_from: string; // DDMMYYYY
    date_to: string; // DDMMYYYY
    type: 'T' | 'NE' | 'E' | 'IA';
    address_code: string;
  }) => void;
  // optional reset back to last month
  onReset?: () => void;
  // UI language for label translation
  lang?: string;
};

export default function OrdersFilter({
  destinations,
  initial,
  onApply,
  onReset,
  lang = 'it',
}: Props) {
  const { t } = useTranslation(lang, 'common');
  const STATUS = [
    { value: 'T' as const, label: t('text-all', { defaultValue: 'Tutti' }) },
    {
      value: 'NE' as const,
      label: t('orders-status-to-fulfill', { defaultValue: 'Da evadere' }),
    },
    {
      value: 'E' as const,
      label: t('orders-status-fulfilled', { defaultValue: 'Evaso' }),
    },
    {
      value: 'IA' as const,
      label: t('orders-status-in-acceptance', {
        defaultValue: 'In accettazione',
      }),
    },
  ];
  const destinationOptions = destinations ?? [
    { value: '', label: t('text-all', { defaultValue: 'Tutti' }) },
  ];
  const defaults = useMemo(() => lastMonthRange(), []);
  const [from, setFrom] = useState<string>(initial?.from || '');
  const [to, setTo] = useState<string>(initial?.to || '');
  const [type, setType] = useState<'T' | 'NE' | 'E' | 'IA'>(
    initial?.type || 'T',
  );
  const [address, setAddress] = useState<string>(initial?.address_code || '');

  // set default "last month" once if not provided
  useEffect(() => {
    if (!initial?.from || !initial?.to) {
      setFrom(defaults.from);
      setTo(defaults.to);
    }
  }, [initial?.from, initial?.to, defaults.from, defaults.to]);

  const apply = () => {
    onApply({
      date_from: toErpDate(from),
      date_to: toErpDate(to),
      type,
      address_code: address || '',
    });
  };

  const reset = () => {
    setFrom(defaults.from);
    setTo(defaults.to);
    setType('T');
    setAddress('');
    onReset?.();
    // you can auto-apply after reset if you prefer:
    // onApply({ date_from: toErpDate(defaults.from), date_to: toErpDate(defaults.to), type: 'T', address_code: '' });
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        {/* Date from */}
        <div className="min-w-[130px]">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
            {t('text-from', { defaultValue: 'Da' })}
          </label>
          <input
            type="date"
            className="h-9 w-full rounded border px-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        {/* Date to */}
        <div className="min-w-[130px]">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
            {t('text-to', { defaultValue: 'A' })}
          </label>
          <input
            type="date"
            className="h-9 w-full rounded border px-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        {/* Status */}
        <div className="min-w-[120px]">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
            {t('text-status', { defaultValue: 'Stato' })}
          </label>
          <select
            className="h-9 w-full rounded border px-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Destination */}
        <div className="min-w-[140px] flex-1">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
            {t('text-destination', { defaultValue: 'Destinazione' })}
          </label>
          <select
            className="h-9 w-full rounded border px-2 text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          >
            {destinationOptions.map((d) => (
              <option key={d.value ?? 'all'} value={d.value ?? ''}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-end gap-2">
          <button
            onClick={reset}
            className="h-9 rounded border px-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            {t('text-reset', { defaultValue: 'Reset' })}
          </button>
          <button
            onClick={apply}
            className="h-9 rounded bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
          >
            {t('text-search', { defaultValue: 'Cerca' })}
          </button>
        </div>
      </div>
    </section>
  );
}
