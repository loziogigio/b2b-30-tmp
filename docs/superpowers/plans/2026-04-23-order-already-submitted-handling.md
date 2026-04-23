# Order-Already-Submitted Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect the `ORDER_NOT_DRAFT` / `ORDER_NOT_RESUBMITTABLE` response codes returned by the Windmill cart-submit endpoint when the cart has already been finalised, show a clear "Ordine già inviato" modal in the checkout send-order step, and reload the page so the UI resyncs with the real ERP state. Mirrors dfl-b2b commit `3be5ead7`.

**Architecture:**

- Extend the `useOrderSubmit` hook with a new `SubmitOutcome` variant `already_submitted` so the server code is propagated up to the UI without leaking HTTP-layer details.
- Check for the code both in the success body (`res?.code`) and in the thrown error's `data?.code`, because the upstream Windmill response shape varies with status.
- Add a small presentational `OrderAlreadySubmittedModal` next to the existing `AnomalyModal` / `DuplicateSubmitModal`, in the same hardcoded-Italian style the two siblings already use (consistent with the checkout surface, no i18n churn).
- Wire the new outcome into `CheckoutSendOrder`: on confirm, `window.location.reload()`.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind, Vitest/RTL.

---

## File Structure

**Created:**

- `src/components/checkout/order-already-submitted-modal.tsx` — standalone presentational modal (no i18n, matches `DuplicateSubmitModal`/`AnomalyModal` style).
- `src/test/hooks/use-order-submit-already-submitted.test.ts` — hook unit tests for the new outcome branch.

**Modified:**

- `src/hooks/use-order-submit.ts` — add `already_submitted` outcome, detection logic in both the success and catch paths, a new `orderAlreadySubmitted` state slice, and a `clearOrderAlreadySubmitted` clearer.
- `src/components/checkout/checkout-send-order.tsx` — consume the new state, render the modal, reload on confirm.

No changes to i18n files (the sibling modals are hardcoded Italian; stay consistent).

---

## Background: Response Shape

The Windmill `/carts/{id}/submit` endpoint returns one of three relevant shapes when the cart cannot be submitted because it is no longer a draft:

1. **HTTP 4xx** (observed variants: 400, 409, 422) with body `{ code: "ORDER_NOT_DRAFT" | "ORDER_NOT_RESUBMITTABLE", error: "..." }`.
2. **HTTP 200** with body `{ code: "ORDER_NOT_DRAFT", error: "..." }` (the autofix-retry response path used in dfl-b2b).
3. **HTTP 200** with body containing `processing: true` or a plain success — handled today.

We therefore check `res?.code` **before** treating a 200 response as success, and `data?.code` in the catch **before** falling through to the generic error branch.

---

## Task 1: Hook — add `already_submitted` outcome type

**Files:**

- Modify: `src/hooks/use-order-submit.ts`

- [ ] **Step 1: Extend the `SubmitOutcome` union and add state slice**

Replace the `SubmitOutcome` type (around [use-order-submit.ts:83-88](src/hooks/use-order-submit.ts#L83-L88)) with:

```ts
export type SubmitOutcome =
  | { type: 'success' }
  | { type: 'processing'; orderId: string }
  | { type: 'anomalies'; result: AnomalyResult }
  | { type: 'duplicate_warning'; warning: DuplicateWarning }
  | { type: 'already_submitted'; message?: string }
  | { type: 'error'; message: string };
```

Inside `useOrderSubmit`, add a new state slice next to the existing ones (around [use-order-submit.ts:95-100](src/hooks/use-order-submit.ts#L95-L100)):

```ts
const [orderAlreadySubmitted, setOrderAlreadySubmitted] = useState<{
  message?: string;
} | null>(null);
```

And a clearer, next to `clearDuplicateWarning` (around [use-order-submit.ts:223-226](src/hooks/use-order-submit.ts#L223-L226)):

```ts
const clearOrderAlreadySubmitted = useCallback(() => {
  setOrderAlreadySubmitted(null);
  setSubmitError(null);
}, []);
```

Extend the state reset at the top of `submitOrder` (around [use-order-submit.ts:111-114](src/hooks/use-order-submit.ts#L111-L114)) to include:

```ts
setOrderAlreadySubmitted(null);
```

Finally, return the new values alongside the existing ones (around [use-order-submit.ts:228-238](src/hooks/use-order-submit.ts#L228-L238)):

```ts
return {
  submitOrder,
  resubmitWithAutofix,
  confirmDuplicateSubmit,
  isSubmitting,
  anomalyResult,
  duplicateWarning,
  orderAlreadySubmitted,
  submitError,
  clearAnomalies,
  clearDuplicateWarning,
  clearOrderAlreadySubmitted,
};
```

- [ ] **Step 2: Run type-check to verify the hook still compiles**

Run:

```bash
npx tsc --noEmit src/hooks/use-order-submit.ts
```

Expected: exits 0 (the union is still exhaustive because no `switch` on it exists yet in the same file).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-order-submit.ts
git commit -m "feat(order-submit): add already_submitted outcome type"
```

---

## Task 2: Hook — detection in the success path (HTTP 200 + error code)

**Files:**

- Modify: `src/hooks/use-order-submit.ts`
- Test: `src/test/hooks/use-order-submit-already-submitted.test.ts`

- [ ] **Step 1: Write the failing test — 200-OK body with `code: "ORDER_NOT_DRAFT"`**

Create `src/test/hooks/use-order-submit-already-submitted.test.ts` with:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@framework/utils/httpPIM', () => ({
  post: vi.fn(),
  get: vi.fn(),
}));
vi.mock('@contexts/cart/cart.context', () => ({
  useCart: () => ({
    meta: { orderId: 'ORDER123' },
    resetCart: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock('@framework/cart/b2b-cart', () => ({
  ensureActiveCart: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: { vinc_order_id: null },
}));

import { post } from '@framework/utils/httpPIM';
import { useOrderSubmit } from '@/hooks/use-order-submit';

const mockPost = post as unknown as ReturnType<typeof vi.fn>;

// Keep window.location.href assignments from actually navigating.
beforeEach(() => {
  mockPost.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: '' },
  });
});

describe('useOrderSubmit — already-submitted detection (200 body)', () => {
  it('returns already_submitted when backend replies 200 with code ORDER_NOT_DRAFT', async () => {
    mockPost.mockResolvedValueOnce({
      code: 'ORDER_NOT_DRAFT',
      error: 'Ordine già inviato',
    });

    const { result } = renderHook(() => useOrderSubmit('it'));

    let outcome: any;
    await act(async () => {
      outcome = await result.current.submitOrder({
        delivery_date: '2026-04-24',
        delivery_type: 'courier',
      });
    });

    expect(outcome).toEqual({
      type: 'already_submitted',
      message: 'Ordine già inviato',
    });
    expect(result.current.orderAlreadySubmitted).toEqual({
      message: 'Ordine già inviato',
    });
  });

  it('also detects ORDER_NOT_RESUBMITTABLE in 200 body', async () => {
    mockPost.mockResolvedValueOnce({
      code: 'ORDER_NOT_RESUBMITTABLE',
    });

    const { result } = renderHook(() => useOrderSubmit('it'));

    let outcome: any;
    await act(async () => {
      outcome = await result.current.submitOrder({
        delivery_date: '2026-04-24',
        delivery_type: 'courier',
      });
    });

    expect(outcome.type).toBe('already_submitted');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm test src/test/hooks/use-order-submit-already-submitted.test.ts
```

Expected: both assertions fail — the hook currently treats the 200 response as success and returns `{ type: 'success' }`.

- [ ] **Step 3: Add detection in the success path**

In `src/hooks/use-order-submit.ts`, after the `pimPost(...)` call and **before** the existing `if (res?.processing)` block (around [use-order-submit.ts:125-134](src/hooks/use-order-submit.ts#L125-L134)), insert:

```ts
// Backend occasionally returns HTTP 200 with an error code body when the
// cart is no longer a draft (e.g. after the ERP batch has finalised it).
// Detect this before treating the response as a success.
if (
  res?.code === 'ORDER_NOT_DRAFT' ||
  res?.code === 'ORDER_NOT_RESUBMITTABLE'
) {
  const payload = { message: res?.error };
  setOrderAlreadySubmitted(payload);
  return { type: 'already_submitted', message: res?.error };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm test src/test/hooks/use-order-submit-already-submitted.test.ts
```

Expected: both cases green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-order-submit.ts src/test/hooks/use-order-submit-already-submitted.test.ts
git commit -m "feat(order-submit): detect ORDER_NOT_DRAFT in 200 response"
```

---

## Task 3: Hook — detection in the catch path (HTTP 4xx + error code)

**Files:**

- Modify: `src/hooks/use-order-submit.ts`
- Test: `src/test/hooks/use-order-submit-already-submitted.test.ts`

- [ ] **Step 1: Extend the test file with a 4xx case**

Append the following `describe` block to `src/test/hooks/use-order-submit-already-submitted.test.ts`:

```ts
describe('useOrderSubmit — already-submitted detection (4xx body)', () => {
  it('returns already_submitted when backend replies 409 with code ORDER_NOT_DRAFT', async () => {
    const err: any = new Error('request failed');
    err.response = {
      status: 409,
      data: { code: 'ORDER_NOT_DRAFT', error: 'Ordine non più modificabile' },
    };
    mockPost.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useOrderSubmit('it'));

    let outcome: any;
    await act(async () => {
      outcome = await result.current.submitOrder({
        delivery_date: '2026-04-24',
        delivery_type: 'courier',
      });
    });

    expect(outcome).toEqual({
      type: 'already_submitted',
      message: 'Ordine non più modificabile',
    });
    expect(result.current.orderAlreadySubmitted).toEqual({
      message: 'Ordine non più modificabile',
    });
  });

  it('falls through to generic 409 error when code is absent', async () => {
    const err: any = new Error('request failed');
    err.response = { status: 409, data: {} };
    mockPost.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useOrderSubmit('it'));

    let outcome: any;
    await act(async () => {
      outcome = await result.current.submitOrder({
        delivery_date: '2026-04-24',
        delivery_type: 'courier',
      });
    });

    // Existing 409-without-code behavior preserved.
    expect(outcome).toEqual({
      type: 'error',
      message: 'Ordine già in fase di invio',
    });
    expect(result.current.orderAlreadySubmitted).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify both new cases fail / pass appropriately**

Run:

```bash
pnpm test src/test/hooks/use-order-submit-already-submitted.test.ts
```

Expected: the "409 with code" test fails (currently hits the generic 409 branch); the "409 without code" test already passes.

- [ ] **Step 3: Add detection in the catch path**

In `src/hooks/use-order-submit.ts`, inside the `catch` block, **immediately after** `const data = error?.response?.data;` and **before** the `if (status === 422)` block (around [use-order-submit.ts:143-151](src/hooks/use-order-submit.ts#L143-L151)), insert:

```ts
// Cart no longer a draft — the ERP batch has already promoted it or the
// ordini row is final. Surface a dedicated outcome so the UI can resync
// by reloading instead of letting the user hammer the Send button.
if (
  data?.code === 'ORDER_NOT_DRAFT' ||
  data?.code === 'ORDER_NOT_RESUBMITTABLE'
) {
  const payload = { message: data?.error };
  setOrderAlreadySubmitted(payload);
  return { type: 'already_submitted', message: data?.error };
}
```

- [ ] **Step 4: Run the full hook test file**

Run:

```bash
pnpm test src/test/hooks/use-order-submit-already-submitted.test.ts
```

Expected: all four cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-order-submit.ts src/test/hooks/use-order-submit-already-submitted.test.ts
git commit -m "feat(order-submit): detect ORDER_NOT_DRAFT in 4xx error response"
```

---

## Task 4: `OrderAlreadySubmittedModal` component

**Files:**

- Create: `src/components/checkout/order-already-submitted-modal.tsx`

- [ ] **Step 1: Create the modal component**

Create `src/components/checkout/order-already-submitted-modal.tsx`:

```tsx
'use client';

interface OrderAlreadySubmittedModalProps {
  message?: string;
  onConfirm: () => void;
}

export default function OrderAlreadySubmittedModal({
  message,
  onConfirm,
}: OrderAlreadySubmittedModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl max-w-[520px] w-full shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 bg-sky-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Ordine già inviato
              </h3>
              <p className="text-sm text-gray-600">
                Questo ordine è già stato inviato. La pagina verrà aggiornata.
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="px-6 pt-4 text-sm text-gray-600">{message}</div>
        )}

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[48px] px-6 py-3 rounded-lg bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 transition-colors uppercase leading-snug"
          >
            Ok, aggiorna la pagina
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check the new file**

Run:

```bash
npx tsc --noEmit src/components/checkout/order-already-submitted-modal.tsx
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/checkout/order-already-submitted-modal.tsx
git commit -m "feat(checkout): add OrderAlreadySubmittedModal component"
```

---

## Task 5: Wire modal into `CheckoutSendOrder`

**Files:**

- Modify: `src/components/checkout/checkout-send-order.tsx`

- [ ] **Step 1: Import the modal and consume the new hook slice**

At the top of `src/components/checkout/checkout-send-order.tsx`, next to the existing imports (around [checkout-send-order.tsx:12-13](src/components/checkout/checkout-send-order.tsx#L12-L13)), add:

```tsx
import OrderAlreadySubmittedModal from './order-already-submitted-modal';
```

Update the `useOrderSubmit` destructure (around [checkout-send-order.tsx:60-70](src/components/checkout/checkout-send-order.tsx#L60-L70)) to:

```tsx
const {
  submitOrder,
  resubmitWithAutofix,
  confirmDuplicateSubmit,
  isSubmitting,
  anomalyResult,
  duplicateWarning,
  orderAlreadySubmitted,
  submitError,
  clearAnomalies,
  clearDuplicateWarning,
} = useOrderSubmit(lang);
```

(We intentionally don't pull `clearOrderAlreadySubmitted`: the modal is confirm-only, which unmounts via a page reload, so no React-side cleanup is needed.)

- [ ] **Step 2: Extend the error banner guard so it doesn't stack on top of the new modal**

Update the banner check (around [checkout-send-order.tsx:144](src/components/checkout/checkout-send-order.tsx#L144)) to:

```tsx
{submitError && !anomalyResult && !duplicateWarning && !orderAlreadySubmitted && (
```

- [ ] **Step 3: Render the modal**

At the end of the component, next to the existing `{duplicateWarning && …}` block (around [checkout-send-order.tsx:191-198](src/components/checkout/checkout-send-order.tsx#L191-L198)), add:

```tsx
{
  orderAlreadySubmitted && (
    <OrderAlreadySubmittedModal
      message={orderAlreadySubmitted.message}
      onConfirm={() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }}
    />
  );
}
```

- [ ] **Step 4: Type-check the modified file**

Run:

```bash
npx tsc --noEmit src/components/checkout/checkout-send-order.tsx
```

Expected: exits 0.

- [ ] **Step 5: Manual smoke test**

Run:

```bash
pnpm dev
```

In another terminal / browser:

1. Open the B2B checkout page with an active cart.
2. In DevTools → Network, right-click the `…/cart/submit` (or equivalent) request and "Override response" with body `{"code":"ORDER_NOT_DRAFT","error":"Ordine già inviato"}` status 200.
3. Click **Send Order**. Expected: modal appears with the sky header and "Ordine già inviato" title. Clicking "Ok, aggiorna la pagina" reloads the page.
4. Change the override to status 409 and repeat. Same result.
5. Remove the override and press Send Order normally. Expected: the modal does not appear; the regular success/anomaly/duplicate flows still behave.

- [ ] **Step 6: Commit**

```bash
git add src/components/checkout/checkout-send-order.tsx
git commit -m "feat(checkout): show order-already-submitted modal and reload on confirm"
```

---

## Task 6: Full test + format pass

**Files:** none (validation only)

- [ ] **Step 1: Run the full test suite**

Run:

```bash
pnpm test
```

Expected: all tests pass, including the four new cases in `use-order-submit-already-submitted.test.ts`.

- [ ] **Step 2: Format**

Run:

```bash
pnpm format
```

Expected: no unresolved formatting issues.

- [ ] **Step 3: Commit (only if format produced changes)**

```bash
git add -A
git status   # confirm only formatting changes
git commit -m "chore: format order-already-submitted changes"
```

Skip if there is nothing to commit.

---

## Notes for the executing agent

- **Do not** run `pnpm build` / `npm run build` — explicitly forbidden by `CLAUDE.md`.
- **Do not** add `Co-Authored-By` or "Generated with Claude Code" lines to commits — forbidden by `CLAUDE.md`.
- Use `--no-verify` on `git commit` only if pre-existing lint errors block an unrelated commit; do not use it to mask errors introduced by this plan.
- Hardcoded Italian strings in the new modal are deliberate — they match the style of the existing `AnomalyModal` and `DuplicateSubmitModal`. Do not introduce new i18n keys for this feature.
- If the running backend returns a code other than `ORDER_NOT_DRAFT` / `ORDER_NOT_RESUBMITTABLE` when the cart is finalised, capture the exact code from the network tab during smoke testing and add it to both the success-path and catch-path guards before finishing Task 5.
