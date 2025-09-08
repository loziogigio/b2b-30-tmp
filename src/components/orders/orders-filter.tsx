'use client';

import { useEffect, useMemo, useState } from 'react';

type StatusOption = { value: 'T' | 'NE' | 'E' | 'IA'; label: string };
type DestinationOption = { value: string; label: string };

const STATUS: StatusOption[] = [
  { value: 'T',  label: 'Tutti' },
  { value: 'NE', label: 'Da evadere' },
  { value: 'E',  label: 'Evaso' },
  { value: 'IA', label: 'In accettazione' },
];

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
    from?: string;       // yyyy-mm-dd
    to?: string;         // yyyy-mm-dd
    type?: 'T' | 'NE' | 'E' | 'IA';
    address_code?: string;
  };
  // called when user presses "Search"
  onApply: (payload: {
    date_from: string;   // DDMMYYYY
    date_to: string;     // DDMMYYYY
    type: 'T' | 'NE' | 'E' | 'IA';
    address_code: string;
  }) => void;
  // optional reset back to last month
  onReset?: () => void;
};

export default function OrdersFilter({
  destinations = [{ value: '', label: 'Tutti' }],
  initial,
  onApply,
  onReset,
}: Props) {
  const defaults = useMemo(() => lastMonthRange(), []);
  const [from, setFrom] = useState<string>(initial?.from || '');
  const [to, setTo] = useState<string>(initial?.to || '');
  const [type, setType] = useState<'T' | 'NE' | 'E' | 'IA'>(initial?.type || 'T');
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Date range */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            FILTRA PER DATA
          </label>
          <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
            <span className="text-sm text-gray-700">Da</span>
            <input
              type="date"
              className="h-10 w-full rounded border px-2 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="text-center text-sm text-gray-700">A</span>
            <input
              type="date"
              className="h-10 w-full rounded border px-2 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            FILTRA PER STATO
          </label>
          <select
            className="h-10 w-full rounded border px-2 text-sm"
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
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            FILTRA PER DESTINAZIONE
          </label>
          <select
            className="h-10 w-full rounded border px-2 text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          >
            {destinations.map((d) => (
              <option key={d.value ?? 'all'} value={d.value ?? ''}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-end justify-end gap-2">
          <button
            onClick={reset}
            className="h-10 rounded border px-4 text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={apply}
            className="h-10 rounded bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Cerca
          </button>
        </div>
      </div>
    </section>
  );
}
