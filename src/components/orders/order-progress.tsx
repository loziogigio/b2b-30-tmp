'use client';

import cn from 'classnames';
import { CheckMark } from './check-mark';

type OrderStatusKey =
  | 'IA'
  | 'NE'
  | 'E';

const STEPS: { key: OrderStatusKey; label: string }[] = [
  { key: 'IA',         label: 'Processing' },
  { key: 'NE',  label: 'At Local Facility' },
  { key: 'E',          label: 'Delivered' },
];

export default function OrderProgress({ status = 'E' }: { status?: OrderStatusKey }) {
  const filledIndex = Math.max(0, STEPS.findIndex(s => s.key === status));
  const lastIdx = STEPS.length - 1;

  // build alternating sequence: DOT, SEGMENT, DOT, SEGMENT, ..., DOT
  const row: React.ReactNode[] = [];
  for (let i = 0; i < STEPS.length; i++) {
    const isDone = i <= filledIndex;

    row.push(
      <div
        key={`dot-${i}`}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border-2',
          isDone
            ? 'bg-teal-600 border-teal-600 text-white'
            : 'bg-white border-gray-300 text-gray-400'
        )}
      >
        {isDone ? (
          <CheckMark className="h-4 w-4" />
        ) : (
          <span className="text-xs font-semibold">{i + 1}</span>
        )}
      </div>
    );

    // add segment only between dots (not before first / after last)
    if (i < lastIdx) {
      row.push(
        <div
          key={`seg-${i}`}
          className={cn(
            'mx-4 h-0.5 flex-1',
            i < filledIndex ? 'bg-teal-600' : 'bg-gray-200'
          )}
        />
      );
    }
  }

  return (
    <div className="w-full py-7">
      <div className="mx-auto w-full max-w-[900px] px-8">
        {/* Row 1: single flex rail with expanding segments */}
        <div className="flex w-full items-center">
          {row}
        </div>

        {/* Row 2: labels under each dot, evenly spaced */}
        <div className="mt-2 flex justify-between">
          {STEPS.map(step => (
            <span
              key={step.key}
              className="w-36 text-center text-sm font-semibold text-gray-800"
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
