'use client';

import { useMemo, useState } from 'react';
import cn from 'classnames';

type Tab = 'invoices' | 'ddt';

type Row = {
  destination: string;
  date: string;          // ISO: YYYY-MM-DD
  document: string;      // e.g. F/2025/92993
  doc_type: string;      // e.g. F, DDT
  number: string;        // e.g. 92993
  pdf?: string;
  barcodePdf?: string;
  csv?: string;
};

const SAMPLE_INVOICES: Row[] = [
  { destination: 'CORSO SAYALONGA, 21', date: '2025-08-29', document: 'F/2025/92993', doc_type: 'F', number: '92993' },
  { destination: 'CORSO SAYALONGA, 21', date: '2025-08-29', document: 'F/2025/92994', doc_type: 'F', number: '92994' },
  { destination: 'CORSO SAYALONGA, 21', date: '2025-08-28', document: 'F/2025/92625', doc_type: 'F', number: '92625' },
  { destination: 'CORSO SAYALONGA, 21', date: '2025-08-19', document: 'F/2025/89766', doc_type: 'F', number: '89766' },
  { destination: 'CORSO SAYALONGA, 21', date: '2025-08-13', document: 'F/2025/88608', doc_type: 'F', number: '88608' },
  { destination: 'CORSO SAYALONGA, 21', date: '2025-08-07', document: 'F/2025/86905', doc_type: 'F', number: '86905' },
];

const SAMPLE_DDT: Row[] = [
  { destination: 'CORSO SAYALONGA, 21', date: '2025-08-29', document: 'DDT/2025/12031', doc_type: 'DDT', number: '12031' },
  { destination: 'CORSO SAYALONGA, 21', date: '2025-08-27', document: 'DDT/2025/11902', doc_type: 'DDT', number: '11902' },
  { destination: 'CORSO SAYALONGA, 21', date: '2025-08-20', document: 'DDT/2025/11766', doc_type: 'DDT', number: '11766' },
];

// helpers
const pad = (n: number) => `${n}`.padStart(2, '0');
const toInputDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const lastMonthRange = () => {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - 30);
  return { from: toInputDate(start), to: toInputDate(today) };
};

type FilterState = { from: string; to: string; type: 'ALL' | 'F' | 'DDT' };

export default function DocumentsFilter({
  initial,
  onApply,
  onReset,
}: {
  initial?: Partial<FilterState>;
  onApply: (f: FilterState) => void;
  onReset?: () => void;
}) {
  const defaults = useMemo(() => lastMonthRange(), []);
  const [from, setFrom] = useState(initial?.from || defaults.from);
  const [to, setTo] = useState(initial?.to || defaults.to);
  const [type, setType] = useState<FilterState['type']>(initial?.type || 'ALL');

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-gray-600">FILTRA PER DATA</label>
          <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
            <span className="text-sm text-gray-700">Da</span>
            <input type="date" className="h-10 w-full rounded border px-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-center text-sm text-gray-700">A</span>
            <input type="date" className="h-10 w-full rounded border px-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">FILTRA PER TIPO</label>
          <select className="h-10 w-full rounded border px-2 text-sm" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="ALL">Tutto</option>
            <option value="F">Fattura</option>
            <option value="DDT">DDT</option>
          </select>
        </div>

        <div className="flex items-end justify-end gap-2">
          <button
            onClick={() => {
              setFrom(defaults.from);
              setTo(defaults.to);
              setType('ALL');
              onReset?.();
            }}
            className="h-10 rounded border px-4 text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={() => onApply({ from, to, type })}
            className="h-10 rounded bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Cerca
          </button>
        </div>
      </div>
    </section>
  );
}