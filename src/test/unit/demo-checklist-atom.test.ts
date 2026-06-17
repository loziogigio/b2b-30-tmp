import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from 'jotai';
import {
  DEMO_STEPS,
  demoCompletedAtom,
  markStepInStore,
  DEMO_CHECKLIST_STORAGE_KEY,
  type DemoStepId,
} from '@/lib/demo/demo-checklist-atom';

describe('demo checklist atom', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defines exactly the 4 happy-path steps in order', () => {
    expect(DEMO_STEPS.map((s) => s.id)).toEqual([
      'browse',
      'add-to-cart',
      'submit-order',
      'open-documents',
    ]);
  });

  it('starts with no completed steps', () => {
    const store = createStore();
    expect(store.get(demoCompletedAtom)).toEqual([]);
  });

  it('markStepInStore adds a step and is idempotent', () => {
    const store = createStore();
    markStepInStore(store, 'browse');
    markStepInStore(store, 'browse');
    expect(store.get(demoCompletedAtom)).toEqual(['browse']);
  });

  it('markStepInStore preserves first-completion order', () => {
    const store = createStore();
    markStepInStore(store, 'add-to-cart');
    markStepInStore(store, 'browse');
    expect(store.get(demoCompletedAtom)).toEqual(['add-to-cart', 'browse']);
  });

  it('persists completed steps to localStorage under the known key', () => {
    const store = createStore();
    markStepInStore(store, 'submit-order');
    const raw = window.localStorage.getItem(DEMO_CHECKLIST_STORAGE_KEY);
    expect(raw).toContain('submit-order');
  });

  it('rejects unknown step ids at the type level (compile guard)', () => {
    // @ts-expect-error 'nope' is not a DemoStepId
    const bad: DemoStepId = 'nope';
    void bad;
    expect(true).toBe(true);
  });
});
