'use client';

import { atomWithStorage } from 'jotai/utils';
import { useAtom } from 'jotai';
import type { createStore } from 'jotai';

export type DemoStepId =
  | 'browse'
  | 'add-to-cart'
  | 'submit-order'
  | 'open-documents';

export interface DemoStep {
  id: DemoStepId;
  /** Italian label shown in the checklist. */
  label: string;
}

/** The 4 happy-path steps, in display order. */
export const DEMO_STEPS: readonly DemoStep[] = [
  { id: 'browse', label: 'Sfoglia il catalogo' },
  { id: 'add-to-cart', label: 'Aggiungi al carrello' },
  { id: 'submit-order', label: 'Invia un ordine' },
  { id: 'open-documents', label: 'Apri le tue fatture' },
] as const;

export const DEMO_CHECKLIST_STORAGE_KEY = 'vinc-demo-checklist-progress';

/**
 * Completed step ids, in first-completion order. Persisted to localStorage so
 * progress survives reloads. `getOnInit: true` so the initial render already
 * reflects any stored progress.
 */
export const demoCompletedAtom = atomWithStorage<DemoStepId[]>(
  DEMO_CHECKLIST_STORAGE_KEY,
  [],
  undefined,
  { getOnInit: true },
);

/**
 * Append a step id to the completed list if not already present (idempotent).
 * Pure store-level helper so it is unit-testable without a React tree and so
 * call-sites can mark steps imperatively.
 */
export function markStepInStore(
  store: ReturnType<typeof createStore>,
  id: DemoStepId,
): void {
  const current = store.get(demoCompletedAtom);
  if (current.includes(id)) return;
  store.set(demoCompletedAtom, [...current, id]);
}

/**
 * React binding for the checklist. `markStep` is idempotent. Safe to call from
 * any client component; the no-op gate is applied by callers via useDemoUi.
 */
export function useDemoChecklist() {
  const [completed, setCompleted] = useAtom(demoCompletedAtom);
  const markStep = (id: DemoStepId) => {
    setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  return { steps: DEMO_STEPS, completed, markStep };
}
