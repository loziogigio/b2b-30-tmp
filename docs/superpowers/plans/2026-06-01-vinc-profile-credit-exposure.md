# VINC Profile — Credit Exposure (Fido) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the `default` theme, source the Fido / Esposizione page from the VINC `credit_exposure` data-model (latest daily snapshot), mapped to the existing `Exposition` UI shape; empty/zeroed state when unavailable; `time`/other themes untouched.

**Architecture:** Reuses the built foundation (`/api/profile/[model]` route — `credit_exposure`'s date field `snapshot_date` is already in `PROFILE_MODEL_DATE_FIELD`; `fetchProfileRecords`; `sourcePolicy`). Adds a pure transform `vincCreditExposureToExposition` (maps the snapshot's 6 fixed coded `lines[]` + header totals → `Exposition`) and a VINC branch in `fetchExposition`.

**Tech Stack:** Next.js 16, React Query, TypeScript, Vitest. Spec: `docs/superpowers/specs/2026-06-01-vinc-profile-data-source-design.md` §6.2. Source guide: VINC `credit_exposure` (6 lines: `rimesse`, `cambiaria`, `bolle_nf`, `ordini_ne`, `prebolle`, `acconti`; header `scaduto_totale`, `da_scadere_totale`, `totale_esposizione`, `fido_assicurato`, `differenza`, `currency`; one record per customer per `snapshot_date`).

**Confirmed:** the Fido page (`src/app/[lang]/(default)/account/fido/fido.client.tsx`) renders `directRemittances*`, `riba*`, `unbilledBills(ToExpire/Total)`, `ordersNotFulfilled(ToExpire/Total)`, `prebills(ToExpire/Total)`, `advancesTotal`, `total2Total`, `trustAssuredTotal`, `differenceTotal` — it does **not** use `trustInternalTotal`/`creditLimitTotal` (those map to 0).

**Conventions:** run one test file with `pnpm test <path>`; aliases `@framework/` → `src/framework/basic-rest/`, `@utils/` → `src/utils/`, `@/` → `src/`; commits have **no** `Co-Authored-By`/`Generated with` lines; `--no-verify` if pre-existing lint blocks; never run `pnpm build`. Working tree has unrelated in-progress files — always `git add` exact paths, never `git add -A`.

---

## File Structure

**New**
- `src/utils/transform/vinc-credit-exposure.ts` — pure `vincCreditExposureToExposition` + `VincCreditExposureRecord` type.
- `src/test/unit/vinc-credit-exposure.test.ts` — mapper tests.
- `src/test/hooks/fetch-exposition-vinc.test.ts` — `fetchExposition` VINC-branch tests.

**Modified**
- `src/framework/basic-rest/acccount/fetch-account.ts` — VINC branch in `fetchExposition`; add `theme` to the `useExpositionQuery` query key.

---

## Task 1: VINC credit_exposure → Exposition transform (pure)

**Files:**
- Create: `src/utils/transform/vinc-credit-exposure.ts`
- Test: `src/test/unit/vinc-credit-exposure.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/test/unit/vinc-credit-exposure.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { vincCreditExposureToExposition } from '@/utils/transform/vinc-credit-exposure';

const rec = {
  _id: 'e1',
  data: {
    snapshot_date: '2026-06-02T00:00:00.000Z',
    currency: 'EUR',
    lines: [
      { code: 'rimesse', label: 'Rimesse Dirette', scaduto: 10, da_scadere: 5, totale: 15 },
      { code: 'cambiaria', label: 'RIBA', scaduto: 2, da_scadere: 3, totale: 5 },
      { code: 'bolle_nf', label: 'Bolle non fatturate', da_scadere: 7, totale: 7 },
      { code: 'ordini_ne', label: 'Ordini non evasi', da_scadere: 8, totale: 8 },
      { code: 'prebolle', label: 'Da scadere', da_scadere: 9, totale: 9 },
      { code: 'acconti', label: 'Acconti', totale: 4 },
    ],
    scaduto_totale: 12,
    da_scadere_totale: 32,
    totale_esposizione: 48,
    fido_assicurato: 50,
    differenza: 2,
  },
};

describe('vincCreditExposureToExposition', () => {
  it('maps the 6 coded lines + header to the Exposition shape', () => {
    const e = vincCreditExposureToExposition(rec);
    expect(e.directRemittancesExpired).toBe(10);
    expect(e.directRemittancesToExpire).toBe(5);
    expect(e.directRemittancesTotal).toBe(15);
    expect(e.ribaExpired).toBe(2);
    expect(e.ribaToExpire).toBe(3);
    expect(e.ribaTotal).toBe(5);
    expect(e.unbilledBillsToExpire).toBe(7);
    expect(e.unbilledBillsTotal).toBe(7);
    expect(e.ordersNotFulfilledToExpire).toBe(8);
    expect(e.ordersNotFulfilledTotal).toBe(8);
    expect(e.prebillsToExpire).toBe(9);
    expect(e.prebillsTotal).toBe(9);
    expect(e.advancesTotal).toBe(4);
    expect(e.total2Total).toBe(48);
    expect(e.trustAssuredTotal).toBe(50);
    expect(e.differenceTotal).toBe(2);
    expect(e.currencyCode).toBe('EUR');
  });

  it('defaults missing lines/fields to 0 (and unused trust fields to 0)', () => {
    const e = vincCreditExposureToExposition({ _id: '', data: {} } as any);
    expect(e.directRemittancesTotal).toBe(0);
    expect(e.advancesTotal).toBe(0);
    expect(e.total2Total).toBe(0);
    expect(e.trustAssuredTotal).toBe(0);
    expect(e.differenceTotal).toBe(0);
    expect(e.trustInternalTotal).toBe(0);
    expect(e.creditLimitTotal).toBe(0);
    expect(e.returnCode).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/vinc-credit-exposure.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation** — create `src/utils/transform/vinc-credit-exposure.ts`:

```ts
import type { Exposition } from '@framework/acccount/types-b2b-account';

export interface VincCreditExposureLine {
  code?: string;
  label?: string;
  scaduto?: number;
  da_scadere?: number;
  totale?: number;
}

export interface VincCreditExposureRecord {
  _id: string;
  data: {
    snapshot_date?: string;
    currency?: string;
    lines?: VincCreditExposureLine[];
    scaduto_totale?: number;
    da_scadere_totale?: number;
    totale_esposizione?: number;
    fido_assicurato?: number;
    differenza?: number;
  };
}

function n(x: unknown): number {
  return Number.isFinite(x as number) ? Number(x) : 0;
}

function byCode(
  lines: VincCreditExposureLine[],
  code: string,
): VincCreditExposureLine | undefined {
  return lines.find((l) => l.code === code);
}

/**
 * Map a VINC credit_exposure snapshot to the existing Exposition UI shape.
 * The 6 fixed line codes (rimesse, cambiaria, bolle_nf, ordini_ne, prebolle,
 * acconti) map to the Fido page's rows. trustInternalTotal / creditLimitTotal
 * are not provided by VINC and not rendered by the page → 0.
 */
export function vincCreditExposureToExposition(
  rec: VincCreditExposureRecord,
): Exposition {
  const d = rec.data ?? {};
  const lines = d.lines ?? [];
  const rim = byCode(lines, 'rimesse');
  const cam = byCode(lines, 'cambiaria');
  const bol = byCode(lines, 'bolle_nf');
  const ord = byCode(lines, 'ordini_ne');
  const pre = byCode(lines, 'prebolle');
  const acc = byCode(lines, 'acconti');

  return {
    currencyCode: d.currency ?? '',
    currencyLabel: d.currency ?? '',

    directRemittancesExpired: n(rim?.scaduto),
    directRemittancesToExpire: n(rim?.da_scadere),
    directRemittancesTotal: n(rim?.totale),

    ribaExpired: n(cam?.scaduto),
    ribaToExpire: n(cam?.da_scadere),
    ribaTotal: n(cam?.totale),

    unbilledBillsToExpire: n(bol?.da_scadere),
    unbilledBillsTotal: n(bol?.totale),

    ordersNotFulfilledToExpire: n(ord?.da_scadere),
    ordersNotFulfilledTotal: n(ord?.totale),

    prebillsToExpire: n(pre?.da_scadere),
    prebillsTotal: n(pre?.totale),

    advancesTotal: n(acc?.totale),

    trustAssuredTotal: n(d.fido_assicurato),
    trustInternalTotal: 0,
    creditLimitTotal: 0,

    total2Total: n(d.totale_esposizione),
    differenceTotal: n(d.differenza),

    message: '',
    returnCode: 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/unit/vinc-credit-exposure.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/transform/vinc-credit-exposure.ts src/test/unit/vinc-credit-exposure.test.ts
git commit --no-verify -m "feat(profile): pure VINC credit_exposure snapshot → Exposition transform"
```

---

## Task 2: Wire the exposition hook (VINC branch)

**Files:**
- Modify: `src/framework/basic-rest/acccount/fetch-account.ts`
- Test: `src/test/hooks/fetch-exposition-vinc.test.ts`

READ `src/framework/basic-rest/acccount/fetch-account.ts` first. `fetchExposition(theme)` currently does `theme === 'time'` → `erpPost('/erp/exposition', buildPayload())`, else `post(GET_EXPOSITION, …)`, then unwraps + `transformExposition`. `buildPayload()` returns `{ ...ERP_STATIC }`. `useExpositionQuery` uses `useThemeId()` and `queryKey: [API_ENDPOINTS_B2B.GET_EXPOSITION]`.

- [ ] **Step 1: Write the failing test** — create `src/test/hooks/fetch-exposition-vinc.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ERP_STATIC.customer_code is read inside fetchExposition's VINC branch.
vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: { customer_code: '015892', address_code: '', id_cart: '0' },
}));

import { fetchExposition } from '@framework/acccount/fetch-account';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.clearAllMocks());

describe('fetchExposition — default (VINC) branch', () => {
  it('fetches the latest credit_exposure snapshot and maps it to Exposition', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          available: true,
          items: [
            {
              _id: 'e1',
              data: {
                currency: 'EUR',
                lines: [
                  { code: 'rimesse', scaduto: 10, da_scadere: 5, totale: 15 },
                ],
                totale_esposizione: 48,
                fido_assicurato: 50,
                differenza: 2,
              },
            },
          ],
          pagination: { page: 1, limit: 1, total: 3, totalPages: 3 },
        }),
      } as any;
    });

    const e = await fetchExposition('default');
    expect(calls[0]).toContain('/api/profile/credit_exposure');
    expect(calls[0]).toContain('relation_id=015892');
    expect(calls[0]).toContain('limit=1');
    expect(e.directRemittancesTotal).toBe(15);
    expect(e.total2Total).toBe(48);
    expect(e.trustAssuredTotal).toBe(50);
  });

  it('returns a zeroed Exposition when no snapshot is available', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ available: false, items: [] }),
    })) as any;
    const e = await fetchExposition('default');
    expect(e.total2Total).toBe(0);
    expect(e.differenceTotal).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/hooks/fetch-exposition-vinc.test.ts`
Expected: FAIL — current default branch posts to the legacy proxy, not `/api/profile/credit_exposure`.

- [ ] **Step 3: Add imports** at the top of `src/framework/basic-rest/acccount/fetch-account.ts`:

```ts
import { sourcePolicy } from '@framework/profile/source-policy';
import { fetchProfileRecords } from '@framework/profile/vinc-profile-client';
import {
  vincCreditExposureToExposition,
  type VincCreditExposureRecord,
} from '@utils/transform/vinc-credit-exposure';
```

- [ ] **Step 4: Add the VINC branch** as the FIRST statement inside `fetchExposition`, before the existing `const raw = …`:

```ts
  // default theme → VINC credit_exposure latest snapshot (zeroed if unavailable;
  // no proxy fallback). Default route sort is -data.snapshot_date, so limit:1
  // returns the most recent snapshot (today's if written, else the previous day).
  if (sourcePolicy(theme).account === 'vinc') {
    const result = await fetchProfileRecords('credit_exposure', {
      relation_id: ERP_STATIC.customer_code,
      limit: 1,
    });
    const rec = result.items?.[0] as VincCreditExposureRecord | undefined;
    if (!result.available || !rec) {
      return vincCreditExposureToExposition({ _id: '', data: {} });
    }
    return vincCreditExposureToExposition(rec);
  }
```

Leave the existing `time` / legacy-proxy code after this point unchanged.

- [ ] **Step 5: Add `theme` to the query key** in `useExpositionQuery`. Change the existing `queryKey` to:

```ts
    queryKey: [API_ENDPOINTS_B2B.GET_EXPOSITION, theme],
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test src/test/hooks/fetch-exposition-vinc.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/framework/basic-rest/acccount/fetch-account.ts src/test/hooks/fetch-exposition-vinc.test.ts
git commit --no-verify -m "feat(profile): exposition (Fido) VINC branch on default theme"
```

---

## Task 3: Manual verification (live app)

**Files:** none.

- [ ] **Step 1: Run the new suites**

Run: `pnpm test src/test/unit/vinc-credit-exposure.test.ts src/test/hooks/fetch-exposition-vinc.test.ts`
Expected: PASS. (Pre-existing unrelated `forms-submit-route.test.ts` failures are not introduced here.)

- [ ] **Step 2: Observe in the running app** (needs `pnpm dev` + a logged-in default-theme customer)

Open `/<lang>/account/fido`. Confirm: network shows `GET /api/profile/credit_exposure?relation_id=…&limit=1`; the 6 rows (Rimesse, RIBA, Bolle non fatturate, Ordini non evasi, Da scadere, Acconti) plus Totale / Fido assicurato / Differenza render with the snapshot values; **Differenza** color matches the legacy convention (red when the customer is over their fido limit). No legacy proxy call.

> **Sign-convention check:** the guide states *negative* `differenza` = over the fido limit (red). The existing page's color logic keys on `differenceTotal`. During this step, confirm an over-limit customer shows red; if the sign is inverted vs the ERP convention the page was built for, raise it (do not silently flip — it's a one-line change to the page's color test once confirmed).

- [ ] **Step 3: Confirm `time` theme unchanged** — on a time-theme tenant the Fido page still loads via `/api/erp/exposition`; no `/api/profile/*` call.

---

## Self-Review (completed by plan author)

**Spec coverage (§6.2 credit_exposure):** maps to the existing `Exposition` shape (parity) → Task 1; latest-snapshot fetch via `fetchProfileRecords('credit_exposure', { limit:1 })` using the already-configured `snapshot_date` default sort → Task 2; empty → zeroed Exposition (no proxy fallback) → Task 2; `time`/proxy untouched → Tasks 2/3. The 6 line codes + header fields are mapped exactly to the fields the Fido page renders (`trustInternalTotal`/`creditLimitTotal` unused → 0).

**Placeholder scan:** none — full code in every step; commands + expected results concrete.

**Type consistency:** `vincCreditExposureToExposition(rec): Exposition`, `VincCreditExposureRecord`, and the `Exposition` field names match `src/framework/basic-rest/acccount/types-b2b-account.ts` and Tasks 1↔2. The route already supports `credit_exposure` (allow-list) and its `snapshot_date` date field (`PROFILE_MODEL_DATE_FIELD`).

**Open nuance (verification, not a code blocker):** the `differenza` sign/color convention — confirmed against an over-limit customer in Task 3 Step 2.
