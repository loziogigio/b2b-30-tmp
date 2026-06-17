'use client';

import React from 'react';
import { useDemoUi } from '@/lib/demo/use-demo-ui';
import { useDemoChecklist } from '@/lib/demo/demo-checklist-atom';

/**
 * Collapsible guided checklist. Renders ONLY when useDemoUi() is true. Reads
 * progress from the persisted Jotai atom (useDemoChecklist). Theme-agnostic:
 * fixed-position card with self-contained classes; no theme branching.
 */
export default function DemoChecklist() {
  const demoUi = useDemoUi();
  const { steps, completed } = useDemoChecklist();
  const [open, setOpen] = React.useState(true);

  if (!demoUi) return null;

  const done = completed.length;
  const total = steps.length;

  return (
    <div
      role="complementary"
      aria-label="Guida demo"
      className="fixed z-40 bottom-4 right-4 w-[260px] rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 text-white text-[13px] font-semibold"
      >
        <span>Prova la demo</span>
        <span className="tabular-nums opacity-80">
          {done} / {total}
        </span>
      </button>
      {open && (
        <ol className="p-3 space-y-1.5">
          {steps.map((step, i) => {
            const isDone = completed.includes(step.id);
            return (
              <li
                key={step.id}
                className="flex items-center gap-2.5 text-[13px]"
              >
                <span className="sr-only">{isDone ? '(completato)' : '(da fare)'}</span>
                <span
                  aria-hidden="true"
                  className={
                    'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ' +
                    (isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-500')
                  }
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <span
                  className={
                    isDone ? 'text-slate-400 line-through' : 'text-slate-700'
                  }
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
