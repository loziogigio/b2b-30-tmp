# VINC Profile — Payment Schedule (Scadenziario) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the `default` theme, source the Scadenziario / deadlines page (`usePaymentDeadlineQuery`/`fetchPaymentDeadline`) from the VINC `payment_schedule` data-model instead of the legacy proxy `payment_deadline`, mapped to the existing `PaymentDeadlineSummary` shape; empty state when unavailable; `time`/other themes untouched.

**Architecture:** Reuses the built foundation (`/api/profile/[model]` route, `fetchProfileRecords`, `sourcePolicy`). Adds `payment_schedule` to the model allow-list + date-field map (`data_scadenza`), a pure transform `vincPaymentScheduleToSummary` (flat scadenze → the page's header/detail row structure + totals), and a VINC branch in `fetchPaymentDeadline`.

**Tech Stack:** Next.js 16, React Query, TypeScript, Vitest. Spec lineage: the VINC profile suite. Source guide: VINC `payment_schedule` — one record per scadenza; fields `scadenza_id, data_scadenza, tipo_code, tipo_label, importo, residuo, valuta, documento{causale,anno,numero,numero_documento,data_documento}`.

**Key UI fact (verified):** `deadlines.client.tsx` renders `data.items` where a row with `isDueView` is a HEADER (shows `description`/`dueDate`/`total`) and a row with `isReferenceView` is a DETAIL (shows `document`/`referenceDate`/`amount`); rows with neither are not rendered. So each VINC scadenza becomes a **header row + detail row pair** (preserving the legacy two-line rendering — this is a data-source migration, not a redesign).

**Mapping per scadenza** → two `PaymentDeadlineRow`s:
- header: `{ isDueView:true, isReferenceView:false, description:tipo_label, type:tipo_code, dueDate:data_scadenza, total:importo, amount:0 }`
- detail: `{ isReferenceView:true, isDueView:false, description:'', document:documento.numero_documento, referenceDate:documento.data_documento, amount:residuo, total:0 }`

**Totals** (per the guide §8, summing `importo`): `totalGeneral` = Σ importo; `totalExpired` = Σ importo where `data_scadenza < today` AND `residuo > 0`; `totalToExpire` = Σ importo where `data_scadenza >= today`.

**Conventions:** run one test file with `pnpm test <path>`; aliases `@framework/` → `src/framework/basic-rest/`, `@utils/` → `src/utils/`, `@/` → `src/`; commits have **no** `Co-Authored-By`/`Generated with` lines; `--no-verify` if pre-existing lint blocks; never run `pnpm build`. Working tree has unrelated in-progress files — always `git add` exact paths, never `git add -A`.

---

## File Structure

**New**
- `src/utils/transform/vinc-payment-schedule.ts` — pure `vincPaymentScheduleToSummary` + `VincScadenzaRecord` type.
- `src/test/unit/vinc-payment-schedule.test.ts` — transform tests.
- `src/test/hooks/fetch-payment-deadline-vinc.test.ts` — hook VINC-branch tests.

**Modified**
- `src/lib/profile/vinc-data-models.ts` — add `payment_schedule` to `PROFILE_MODELS` + `PROFILE_MODEL_DATE_FIELD`.
- `src/test/unit/vinc-data-models-query.test.ts` — update the allow-list + date-field assertions.
- `src/framework/basic-rest/acccount/fetch-account.ts` — VINC branch in `fetchPaymentDeadline`; add `theme` to the `usePaymentDeadlineQuery` query key.

---

## Task 1: Allow-list + date field for payment_schedule (foundation)

**Files:**
- Modify: `src/lib/profile/vinc-data-models.ts`
- Test: `src/test/unit/vinc-data-models-query.test.ts`

- [ ] **Step 1: Update the failing assertions** in `src/test/unit/vinc-data-models-query.test.ts`.

Change the `PROFILE_MODELS` allow-list assertion to include `payment_schedule`:

```ts
    expect(PROFILE_MODELS).toEqual([
      'historical_order',
      'credit_exposure',
      'invoice',
      'delivery_note',
      'payment_schedule',
    ]);
```

And add `payment_schedule` to the `isProfileModel` accept case (in the same `it` that checks `isProfileModel`), e.g. after the existing `expect(isProfileModel('historical_order')).toBe(true);` add:

```ts
    expect(isProfileModel('payment_schedule')).toBe(true);
```

Update the `PROFILE_MODEL_DATE_FIELD` assertion to include the new entry:

```ts
    expect(PROFILE_MODEL_DATE_FIELD).toEqual({
      historical_order: 'document_date',
      delivery_note: 'data',
      invoice: 'data',
      credit_exposure: 'snapshot_date',
      payment_schedule: 'data_scadenza',
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/vinc-data-models-query.test.ts`
Expected: FAIL — `payment_schedule` not in `PROFILE_MODELS` / `PROFILE_MODEL_DATE_FIELD`.

- [ ] **Step 3: Implement in `src/lib/profile/vinc-data-models.ts`.**

(a) Add `'payment_schedule'` as the last entry of the `PROFILE_MODELS` array:

```ts
export const PROFILE_MODELS = [
  'historical_order',
  'credit_exposure',
  'invoice',
  'delivery_note',
  'payment_schedule',
] as const;
```

(b) Add the date-field entry to `PROFILE_MODEL_DATE_FIELD`:

```ts
  payment_schedule: 'data_scadenza',
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/test/unit/vinc-data-models-query.test.ts src/test/api/profile-route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile/vinc-data-models.ts src/test/unit/vinc-data-models-query.test.ts
git commit --no-verify -m "feat(profile): allow-list payment_schedule (date field data_scadenza)"
```

---

## Task 2: VINC payment_schedule → PaymentDeadlineSummary transform (pure)

**Files:**
- Create: `src/utils/transform/vinc-payment-schedule.ts`
- Test: `src/test/unit/vinc-payment-schedule.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/test/unit/vinc-payment-schedule.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { vincPaymentScheduleToSummary } from '@/utils/transform/vinc-payment-schedule';

const recs = [
  {
    _id: 'a',
    data: {
      scadenza_id: '1',
      data_scadenza: '2026-01-03T00:00:00Z', // past (vs today 2026-06-02)
      tipo_code: 'C3',
      tipo_label: 'Bonifico',
      importo: 100,
      residuo: 100,
      valuta: 'EUR',
      documento: { numero_documento: 'F/2026/54', data_documento: '2026-01-02T00:00:00Z' },
    },
  },
  {
    _id: 'b',
    data: {
      scadenza_id: '2',
      data_scadenza: '2026-12-31T00:00:00Z', // future
      tipo_code: 'RB',
      tipo_label: 'Ricevuta bancaria',
      importo: 40,
      residuo: 40,
      valuta: 'EUR',
      documento: { numero_documento: 'F/2026/99', data_documento: '2026-06-01T00:00:00Z' },
    },
  },
];

describe('vincPaymentScheduleToSummary', () => {
  it('emits a header+detail pair per scadenza and computes totals', () => {
    const s = vincPaymentScheduleToSummary(recs, '2026-06-02');
    // 2 scadenze → 4 rows
    expect(s.items).toHaveLength(4);

    const [h1, d1, h2, d2] = s.items;
    // header 1
    expect(h1.isDueView).toBe(true);
    expect(h1.isReferenceView).toBe(false);
    expect(h1.description).toBe('Bonifico');
    expect(h1.dueDate).toBe('2026-01-03T00:00:00Z');
    expect(h1.total).toBe(100);
    // detail 1
    expect(d1.isReferenceView).toBe(true);
    expect(d1.isDueView).toBe(false);
    expect(d1.document).toBe('F/2026/54');
    expect(d1.referenceDate).toBe('2026-01-02T00:00:00Z');
    expect(d1.amount).toBe(100);
    // header 2 / detail 2 exist
    expect(h2.description).toBe('Ricevuta bancaria');
    expect(d2.document).toBe('F/2026/99');

    expect(s.currencyCode).toBe('EUR');
    expect(s.totalGeneral).toBe(140);
    expect(s.totalExpired).toBe(100); // scadenza 1 is past + residuo>0
    expect(s.totalToExpire).toBe(40); // scadenza 2 is future
  });

  it('returns an empty summary for no records', () => {
    const s = vincPaymentScheduleToSummary([], '2026-06-02');
    expect(s.items).toEqual([]);
    expect(s.totalGeneral).toBe(0);
    expect(s.totalExpired).toBe(0);
    expect(s.totalToExpire).toBe(0);
    expect(s.currencyCode).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/vinc-payment-schedule.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation** — create `src/utils/transform/vinc-payment-schedule.ts`:

```ts
import type {
  PaymentDeadlineSummary,
  PaymentDeadlineRow,
} from '@framework/acccount/types-b2b-account';

export interface VincScadenzaRecord {
  _id: string;
  data: {
    scadenza_id?: string;
    data_scadenza?: string;
    tipo_code?: string;
    tipo_label?: string;
    importo?: number;
    residuo?: number;
    valuta?: string;
    documento?: {
      causale?: string;
      anno?: number;
      numero?: number;
      numero_documento?: string;
      data_documento?: string;
    };
  };
}

function n(x: unknown): number {
  return Number.isFinite(x as number) ? Number(x) : 0;
}

/**
 * Map a flat list of VINC payment_schedule (scadenze) records to the existing
 * PaymentDeadlineSummary. Each scadenza becomes a header row (isDueView) +
 * a detail row (isReferenceView), matching how deadlines.client.tsx renders.
 * `todayISO` is YYYY-MM-DD; injected so the transform stays pure/testable.
 */
export function vincPaymentScheduleToSummary(
  records: VincScadenzaRecord[],
  todayISO: string,
): PaymentDeadlineSummary {
  const items: PaymentDeadlineRow[] = [];
  let totalGeneral = 0;
  let totalExpired = 0;
  let totalToExpire = 0;
  let currencyCode = '';

  for (const rec of records) {
    const d = rec.data ?? {};
    const importo = n(d.importo);
    const residuo = n(d.residuo);
    const due = d.data_scadenza ?? '';
    const isPast = due.slice(0, 10) < todayISO;

    if (!currencyCode && d.valuta) currencyCode = d.valuta;

    totalGeneral += importo;
    if (isPast && residuo > 0) totalExpired += importo;
    if (!isPast) totalToExpire += importo;

    items.push({
      isDueView: true,
      isReferenceView: false,
      description: d.tipo_label ?? '',
      type: d.tipo_code,
      dueDate: due || undefined,
      total: importo,
      amount: 0,
    });
    items.push({
      isReferenceView: true,
      isDueView: false,
      description: '',
      document: d.documento?.numero_documento ?? undefined,
      referenceDate: d.documento?.data_documento ?? undefined,
      amount: residuo,
      total: 0,
    });
  }

  return {
    currencyCode,
    currencyLabel: currencyCode,
    items,
    totalGeneral,
    totalExpired,
    totalToExpire,
  };
}
```

> Note: if `PaymentDeadlineRow` / `PaymentDeadlineSummary` have required fields this code omits, STOP and report (the known shape is: `PaymentDeadlineRow` requires `description, amount, total, isReferenceView, isDueView`; `PaymentDeadlineSummary` requires `currencyCode, currencyLabel, items, totalGeneral, totalExpired, totalToExpire`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/unit/vinc-payment-schedule.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/transform/vinc-payment-schedule.ts src/test/unit/vinc-payment-schedule.test.ts
git commit --no-verify -m "feat(profile): pure VINC payment_schedule -> PaymentDeadlineSummary transform"
```

---

## Task 3: Wire fetchPaymentDeadline (VINC branch)

**Files:**
- Modify: `src/framework/basic-rest/acccount/fetch-account.ts`
- Test: `src/test/hooks/fetch-payment-deadline-vinc.test.ts`

READ `src/framework/basic-rest/acccount/fetch-account.ts` first. `fetchPaymentDeadline(theme)` currently does `theme==='time'` → `erpPost('/erp/payment_deadline', …)`, else `post(GET_PAYMENT_DEADLINE, …)`, then unwraps + `transformPaymentDeadline`. `usePaymentDeadlineQuery` uses `useThemeId()`, `queryKey: [API_ENDPOINTS_B2B.GET_PAYMENT_DEADLINE]`. `sourcePolicy`, `fetchProfileRecords`, and `ERP_STATIC` are already imported in this file (from earlier profile tasks).

- [ ] **Step 1: Write the failing test** — create `src/test/hooks/fetch-payment-deadline-vinc.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: { customer_code: '015892', vinc_customer_id: 'cust_X', address_code: '', id_cart: '0' },
}));

import { fetchPaymentDeadline } from '@framework/acccount/fetch-account';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.clearAllMocks());

describe('fetchPaymentDeadline — default (VINC) branch', () => {
  it('fetches payment_schedule and maps to header/detail rows + totals', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          available: true,
          items: [
            {
              _id: 'a',
              data: {
                data_scadenza: '2026-12-31T00:00:00Z',
                tipo_label: 'Bonifico',
                tipo_code: 'C3',
                importo: 100,
                residuo: 100,
                valuta: 'EUR',
                documento: { numero_documento: 'F/2026/54', data_documento: '2026-01-02T00:00:00Z' },
              },
            },
          ],
        }),
      } as any;
    });

    const s = await fetchPaymentDeadline('default');
    expect(calls[0]).toContain('/api/profile/payment_schedule');
    expect(calls[0]).toContain('relation_id=015892');
    expect(s.items).toHaveLength(2); // header + detail
    expect(s.items[0].isDueView).toBe(true);
    expect(s.items[0].description).toBe('Bonifico');
    expect(s.items[1].isReferenceView).toBe(true);
    expect(s.items[1].document).toBe('F/2026/54');
    expect(s.totalGeneral).toBe(100);
  });

  it('returns an empty summary when unavailable', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ available: false, items: [] }),
    })) as any;
    const s = await fetchPaymentDeadline('default');
    expect(s.items).toEqual([]);
    expect(s.totalGeneral).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/hooks/fetch-payment-deadline-vinc.test.ts`
Expected: FAIL — current default branch posts to the legacy proxy.

- [ ] **Step 3: Add imports** at the top of `src/framework/basic-rest/acccount/fetch-account.ts` (these may already be imported from earlier profile tasks — check and do NOT duplicate `sourcePolicy`/`fetchProfileRecords`):

```ts
import {
  vincPaymentScheduleToSummary,
  type VincScadenzaRecord,
} from '@utils/transform/vinc-payment-schedule';
```

- [ ] **Step 4: Add the VINC branch** as the FIRST statement inside `fetchPaymentDeadline`, before the existing `const raw = …`:

```ts
  // default theme → VINC payment_schedule (Scadenziario); empty summary if
  // unavailable, no proxy fallback. Oldest-due first.
  if (sourcePolicy(theme).account === 'vinc') {
    const result = await fetchProfileRecords('payment_schedule', {
      relation_id: ERP_STATIC.customer_code,
      sort: 'data.data_scadenza',
      limit: 200,
    });
    const todayISO = new Date().toISOString().slice(0, 10);
    if (!result.available) {
      return vincPaymentScheduleToSummary([], todayISO);
    }
    return vincPaymentScheduleToSummary(
      result.items as VincScadenzaRecord[],
      todayISO,
    );
  }
```

Leave the existing `time` / legacy-proxy code after this point unchanged.

- [ ] **Step 5: Add `theme` to the query key** in `usePaymentDeadlineQuery`. Change the existing `queryKey` to:

```ts
    queryKey: [API_ENDPOINTS_B2B.GET_PAYMENT_DEADLINE, theme],
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test src/test/hooks/fetch-payment-deadline-vinc.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/framework/basic-rest/acccount/fetch-account.ts src/test/hooks/fetch-payment-deadline-vinc.test.ts
git commit --no-verify -m "feat(profile): scadenziario (payment_deadline) VINC branch on default theme"
```

## Hard rules (Task 3)
- Modify ONLY `fetchPaymentDeadline` (add VINC branch) and the `usePaymentDeadlineQuery` queryKey. Do NOT touch `fetchExposition`, `fetchCustomer`, `fetchAddresses`, etc. Leave the `time`/proxy branches unchanged. No duplicate imports.

---

## Task 4: Verify

**Files:** none.

- [ ] **Step 1: Run the new suites + regressions**

Run: `pnpm test src/test/unit/vinc-payment-schedule.test.ts src/test/hooks/fetch-payment-deadline-vinc.test.ts src/test/unit/vinc-data-models-query.test.ts src/test/api/profile-route.test.ts`
Expected: all PASS. (Pre-existing unrelated `forms-submit-route.test.ts` failures are not introduced here.)

- [ ] **Step 2: Observe in the running app** (needs `pnpm dev` + a logged-in default-theme customer with scadenze)

Open `/<lang>/account/deadlines`. Confirm: network shows `GET /api/profile/payment_schedule?relation_id=…&sort=data.data_scadenza` (NOT `POST /api/proxy/b2b/account/payment_deadline`); the table shows each scadenza as a header line (tipo + due date + importo) followed by a detail line (documento + doc date + residuo); the top strip shows Totale generale / scaduto / da scadere. No legacy proxy call.

- [ ] **Step 3: Confirm `time` theme unchanged** — on a time-theme tenant the deadlines page still loads via `/api/erp/payment_deadline`; no `/api/profile/*` call.

---

## Self-Review (completed by plan author)

**Goal coverage:** default-theme `fetchPaymentDeadline` → VINC `payment_schedule` (Task 3); model allow-listed with its `data_scadenza` date field (Task 1); flat scadenze → the page's header/detail rows + totals (Task 2). Empty → empty summary (no proxy fallback). `time`/proxy untouched.

**Placeholder scan:** none — full code in every step; commands + expected results concrete.

**Type consistency:** `vincPaymentScheduleToSummary(records, todayISO): PaymentDeadlineSummary`, `VincScadenzaRecord`, and the `PaymentDeadlineRow`/`PaymentDeadlineSummary` field names match `src/framework/basic-rest/acccount/types-b2b-account.ts` and the deadlines UI's `isDueView`/`isReferenceView`/`total`/`amount`/`dueDate`/`referenceDate`/`document`/`description` usage. Adding `payment_schedule` to `PROFILE_MODELS` keeps the route generic; existing route/orders tests use other models so they are unaffected (the allow-list test is updated in Task 1).

**Known parity notes (not blockers):** (1) the deadlines table's status dot is hardcoded green in the current UI — unchanged (out of scope); (2) totals sum `importo` per the guide; the page can alternatively show credit_exposure aggregates, but standalone client-side sums match the legacy page's behavior; (3) each scadenza renders as two stacked rows (header+detail), preserving the current ERP-driven rendering rather than the flat one-row table in the guide screenshot.
