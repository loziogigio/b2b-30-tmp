# VINC Profile — Documents (DDT + Invoice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the `default` theme, source the customer Documents page (DDT tab → `delivery_note`, Fatture tab → `invoice`) from the VINC data-models API, mapping to the existing `DocumentRow` UI shape, with the PDF/barcode/CSV buttons opening the VINC-provided document URLs; empty state when a model is unavailable. `time` theme and other themes are untouched.

**Architecture:** Reuses the already-built profile foundation (`/api/profile/[model]` route, `fetchProfileRecords` client, `sourcePolicy`). Adds: a per-model date-field so the generic query filters/sorts on each model's real date field (`delivery_note`/`invoice` use `data`, not `document_date`); pure transforms VINC `delivery_note`/`invoice` → `DocumentRow` (carrying `pdf`/`barcodePdf`/`csv` URLs); a VINC branch in `fetchDocumentsList`; and `openDocument` opens a row's direct VINC URL when present (else the existing ERP wrapper).

**Tech Stack:** Next.js 16, React Query, TypeScript, Vitest. Spec: `docs/superpowers/specs/2026-06-01-vinc-profile-data-source-design.md` §6.3/§6.4. Foundation plan: `docs/superpowers/plans/2026-06-01-vinc-profile-orders.md`.

**Live-confirmed VINC schemas (this dev env):**
- `delivery_note`: `numero_ddt`(extref), `numero_documento`, `data`(date), `data_consegna`, `stato`, `destinazione{code,label,street,city,province,postal_code,country}`, `totale`, `pdf_url`, `pdf_barcode_url`, `items[]`, `erp_meta{}`.
- `invoice`: `numero_fattura`(extref), `numero_documento`, `data`(date), `data_scadenza`, `tipo`, `stato_pagamento`, `valuta`, `imponibile`, `iva`, `totale`, `importo_pagato`, `importo_residuo`, `destinazione{…}`, `payment_method`, `agent_code`, `notes`, `pdf_url`, `pdf_barcode_url`, `csv_url`, `erp_meta{}`.

**Conventions:** run one test file with `pnpm test <path>`; aliases `@framework/` → `src/framework/basic-rest/`, `@utils/` → `src/utils/`, `@/` → `src/`; commit messages have **no** `Co-Authored-By`/`Generated with` lines; `--no-verify` if pre-existing lint blocks; never run `pnpm build`. Working tree has unrelated in-progress files — always `git add` exact paths, never `git add -A`.

---

## File Structure

**New**
- `src/utils/transform/vinc-document.ts` — pure transforms `vincDeliveryNoteToRow`, `vincInvoiceToRow`, + helpers (`isoToDmy`, `ddmmyyyyToIso`, `pickDirectUrl`) and the `VincDeliveryNoteRecord` / `VincInvoiceRecord` types.
- `src/test/unit/vinc-document.test.ts` — transform + helper tests.
- `src/test/hooks/fetch-documents-list-vinc.test.ts` — documents hook VINC-branch + `openDocument` direct-URL tests.

**Modified**
- `src/lib/profile/vinc-data-models.ts` — add `PROFILE_MODEL_DATE_FIELD`; parameterize `buildRecordsQuery(p, dateField)`.
- `src/app/api/profile/[model]/route.ts` — pass the model's date field to `buildRecordsQuery`.
- `src/test/unit/vinc-data-models-query.test.ts` — add a `dateField` case.
- `src/framework/basic-rest/documents/fetch-documents-list.ts` — VINC branch in `fetchDocumentsList`; `openDocument` prefers a row's direct URL; add `theme` to the query key.

---

## Task 1: Per-model date field (foundation)

The generic query builder hardcodes `document_date`. `delivery_note`/`invoice` filter & sort on `data`. Parameterize it and have the route pass each model's date field.

**Files:**
- Modify: `src/lib/profile/vinc-data-models.ts`
- Modify: `src/app/api/profile/[model]/route.ts`
- Test: `src/test/unit/vinc-data-models-query.test.ts`

- [ ] **Step 1: Add the failing test** — append to `src/test/unit/vinc-data-models-query.test.ts` (inside the existing `describe('buildRecordsQuery', …)` block, as a new `it`):

```ts
  it('uses a custom date field for filters and default sort', () => {
    const q = buildRecordsQuery(
      { relation_id: '015892', date_from: '2026-05-01', date_to: '2026-05-31' },
      'data',
    );
    expect(q.get('filter[data][gte]')).toBe('2026-05-01');
    expect(q.get('filter[data][lte]')).toBe('2026-05-31');
    expect(q.get('sort')).toBe('-data.data');
    // legacy document_date filter must NOT be emitted for this model
    expect(q.get('filter[document_date][gte]')).toBeNull();
  });
```

Also add this `it` to confirm the allow-list date-field map exists — append after the existing `describe('PROFILE_MODELS allow-list', …)` block a new block:

```ts
import { PROFILE_MODEL_DATE_FIELD } from '@/lib/profile/vinc-data-models';

describe('PROFILE_MODEL_DATE_FIELD', () => {
  it('maps each model to its date field', () => {
    expect(PROFILE_MODEL_DATE_FIELD).toEqual({
      historical_order: 'document_date',
      delivery_note: 'data',
      invoice: 'data',
      credit_exposure: 'snapshot_date',
    });
  });
});
```

(If `PROFILE_MODELS`/`buildRecordsQuery` are already imported at the top of the file, do not duplicate the import — add `PROFILE_MODEL_DATE_FIELD` to the existing import instead of a second `import` line.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/vinc-data-models-query.test.ts`
Expected: FAIL — `PROFILE_MODEL_DATE_FIELD` undefined and `buildRecordsQuery` ignores the 2nd arg.

- [ ] **Step 3: Implement in `src/lib/profile/vinc-data-models.ts`**

(a) After the `ProfileModel` type / `isProfileModel` function, add the date-field map:

```ts
/** Top-level data.* date field each model filters & sorts on. */
export const PROFILE_MODEL_DATE_FIELD: Record<ProfileModel, string> = {
  historical_order: 'document_date',
  delivery_note: 'data',
  invoice: 'data',
  credit_exposure: 'snapshot_date',
};
```

(b) Replace the existing `buildRecordsQuery` function with the parameterized version (adds `dateField` with the old default):

```ts
export function buildRecordsQuery(
  p: ProfileQuery,
  dateField = 'document_date',
): URLSearchParams {
  const q = new URLSearchParams();
  q.set('relation_id', p.relation_id);
  q.set('limit', String(p.limit ?? 50));
  if (p.page != null) q.set('page', String(p.page));
  q.set('sort', p.sort ?? `-data.${dateField}`);
  if (p.status) q.set('filter[status]', p.status);
  if (p.date_from) q.set(`filter[${dateField}][gte]`, p.date_from);
  if (p.date_to) q.set(`filter[${dateField}][lte]`, p.date_to);
  if (p.document_number) q.set('filter[document_number]', p.document_number);
  return q;
}
```

- [ ] **Step 4: Pass the date field from the route** — in `src/app/api/profile/[model]/route.ts`:

(a) add `PROFILE_MODEL_DATE_FIELD` to the existing import from `@/lib/profile/vinc-data-models`.

(b) change the `buildRecordsQuery({...})` call to pass the model's date field as the 2nd arg:

```ts
  const query = buildRecordsQuery(
    {
      relation_id: relationId,
      status: sp.get('status') ?? undefined,
      date_from: sp.get('date_from') ?? undefined,
      date_to: sp.get('date_to') ?? undefined,
      document_number: sp.get('document_number') ?? undefined,
      page: sp.get('page') ? Number(sp.get('page')) : undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
      sort: sp.get('sort') ?? undefined,
    },
    PROFILE_MODEL_DATE_FIELD[model],
  );
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/test/unit/vinc-data-models-query.test.ts src/test/api/profile-route.test.ts`
Expected: PASS. (The existing route test uses `historical_order` → `document_date`, so its `filter[document_date][gte]` assertion still holds.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/profile/vinc-data-models.ts src/app/api/profile/[model]/route.ts src/test/unit/vinc-data-models-query.test.ts
git commit --no-verify -m "feat(profile): per-model date field for the data-models query (delivery_note/invoice use 'data')"
```

---

## Task 2: VINC document transforms (pure)

**Files:**
- Create: `src/utils/transform/vinc-document.ts`
- Test: `src/test/unit/vinc-document.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/test/unit/vinc-document.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  isoToDmy,
  ddmmyyyyToIso,
  pickDirectUrl,
  vincDeliveryNoteToRow,
  vincInvoiceToRow,
} from '@/utils/transform/vinc-document';

describe('date helpers', () => {
  it('isoToDmy formats an ISO date to DD/MM/YYYY', () => {
    expect(isoToDmy('2026-05-28T00:00:00.000Z')).toBe('28/05/2026');
    expect(isoToDmy('2026-05-28')).toBe('28/05/2026');
    expect(isoToDmy('')).toBe('');
    expect(isoToDmy(undefined)).toBe('');
  });
  it('ddmmyyyyToIso converts DDMMYYYY to YYYY-MM-DD, undefined on bad input', () => {
    expect(ddmmyyyyToIso('28052026')).toBe('2026-05-28');
    expect(ddmmyyyyToIso('')).toBeUndefined();
    expect(ddmmyyyyToIso('nope')).toBeUndefined();
  });
});

describe('vincDeliveryNoteToRow', () => {
  const rec = {
    _id: 'd1',
    data: {
      numero_ddt: '12345',
      numero_documento: 'DDT/2026/12345',
      data: '2026-05-28T00:00:00.000Z',
      stato: 'shipped',
      destinazione: { label: 'SEDE', street: 'VIA X', city: 'ROMA' },
      totale: 100,
      pdf_url: 'https://cs/ddt.pdf',
      pdf_barcode_url: 'https://cs/ddt-bc.pdf',
    },
  };
  it('maps to a DDT DocumentRow with VINC urls', () => {
    const r = vincDeliveryNoteToRow(rec);
    expect(r.doc_type).toBe('DDT');
    expect(r.document).toBe('DDT/2026/12345');
    expect(r.number).toBe('12345');
    expect(r.destination).toBe('SEDE');
    expect(r.dateISO).toBe('2026-05-28');
    expect(r.date_label).toBe('28/05/2026');
    expect(r.barcodePdf).toBe('https://cs/ddt-bc.pdf');
    expect(r.pdf).toBe('https://cs/ddt.pdf');
  });
  it('falls back to street+city when destinazione.label missing', () => {
    const r = vincDeliveryNoteToRow({
      ...rec,
      data: { ...rec.data, destinazione: { street: 'VIA X', city: 'ROMA' } },
    });
    expect(r.destination).toBe('VIA X - ROMA');
  });
});

describe('vincInvoiceToRow', () => {
  const rec = {
    _id: 'i1',
    data: {
      numero_fattura: '90540',
      numero_documento: 'F/2026/90540',
      data: '2026-05-28',
      destinazione: { label: 'SEDE' },
      totale: 200,
      pdf_url: 'https://cs/inv.pdf',
      pdf_barcode_url: 'https://cs/inv-bc.pdf',
      csv_url: 'https://cs/inv.csv',
    },
  };
  it('maps to an F DocumentRow with pdf/barcode/csv urls', () => {
    const r = vincInvoiceToRow(rec);
    expect(r.doc_type).toBe('F');
    expect(r.document).toBe('F/2026/90540');
    expect(r.number).toBe('90540');
    expect(r.pdf).toBe('https://cs/inv.pdf');
    expect(r.barcodePdf).toBe('https://cs/inv-bc.pdf');
    expect(r.csv).toBe('https://cs/inv.csv');
  });
});

describe('pickDirectUrl', () => {
  it('selects the url for each action kind', () => {
    const row: any = { pdf: 'p', barcodePdf: 'b', csv: 'c' };
    expect(pickDirectUrl('pdf', row)).toBe('p');
    expect(pickDirectUrl('barcode', row)).toBe('b');
    expect(pickDirectUrl('csv', row)).toBe('c');
    expect(pickDirectUrl('pdf', {} as any)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/vinc-document.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation** — create `src/utils/transform/vinc-document.ts`:

```ts
import type { DocumentRow } from '@framework/documents/types-b2b-documents';

type VincDest = {
  code?: string;
  label?: string;
  street?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
};

export interface VincDeliveryNoteRecord {
  _id: string;
  data: {
    numero_ddt?: string;
    numero_documento?: string;
    data?: string;
    data_consegna?: string | null;
    stato?: string;
    destinazione?: VincDest;
    totale?: number;
    pdf_url?: string;
    pdf_barcode_url?: string;
  };
}

export interface VincInvoiceRecord {
  _id: string;
  data: {
    numero_fattura?: string;
    numero_documento?: string;
    data?: string;
    data_scadenza?: string | null;
    tipo?: string;
    stato_pagamento?: string;
    destinazione?: VincDest;
    totale?: number;
    pdf_url?: string;
    pdf_barcode_url?: string;
    csv_url?: string;
  };
}

/** ISO ("2026-05-28T…" or "2026-05-28") → "DD/MM/YYYY". '' on empty. */
export function isoToDmy(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

/** DDMMYYYY → YYYY-MM-DD; undefined for malformed input. */
export function ddmmyyyyToIso(s?: string): string | undefined {
  if (!s || !/^\d{8}$/.test(s)) return undefined;
  return `${s.slice(4)}-${s.slice(2, 4)}-${s.slice(0, 2)}`;
}

function destinationOf(a?: VincDest): string {
  if (!a) return '';
  if (a.label) return a.label;
  return [a.street, a.city].filter(Boolean).join(' - ');
}

export function vincDeliveryNoteToRow(rec: VincDeliveryNoteRecord): DocumentRow {
  const d = rec.data ?? {};
  return {
    destination: destinationOf(d.destinazione),
    dateISO: (d.data ?? '').slice(0, 10),
    date_label: isoToDmy(d.data),
    document: d.numero_documento || d.numero_ddt || '',
    doc_type: 'DDT',
    number: String(d.numero_ddt ?? d.numero_documento ?? ''),
    scope: '',
    year: 0,
    number_raw: 0,
    type_bar_code: '',
    pdf: d.pdf_url || undefined,
    barcodePdf: d.pdf_barcode_url || undefined,
  };
}

export function vincInvoiceToRow(rec: VincInvoiceRecord): DocumentRow {
  const d = rec.data ?? {};
  return {
    destination: destinationOf(d.destinazione),
    dateISO: (d.data ?? '').slice(0, 10),
    date_label: isoToDmy(d.data),
    document: d.numero_documento || d.numero_fattura || '',
    doc_type: 'F',
    number: String(d.numero_fattura ?? d.numero_documento ?? ''),
    scope: '',
    year: 0,
    number_raw: 0,
    type_bar_code: '',
    pdf: d.pdf_url || undefined,
    barcodePdf: d.pdf_barcode_url || undefined,
    csv: d.csv_url || undefined,
  };
}

export type DirectKind = 'pdf' | 'barcode' | 'csv';

/** The VINC-provided document URL for an action kind, if the row carries it. */
export function pickDirectUrl(
  kind: DirectKind,
  row: DocumentRow,
): string | undefined {
  return kind === 'pdf' ? row.pdf : kind === 'barcode' ? row.barcodePdf : row.csv;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/unit/vinc-document.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/transform/vinc-document.ts src/test/unit/vinc-document.test.ts
git commit --no-verify -m "feat(profile): pure VINC delivery_note/invoice → DocumentRow transforms"
```

---

## Task 3: Wire the documents hook + actions

**Files:**
- Modify: `src/framework/basic-rest/documents/fetch-documents-list.ts`
- Test: `src/test/hooks/fetch-documents-list-vinc.test.ts`

READ `src/framework/basic-rest/documents/fetch-documents-list.ts` first. It has `fetchDocumentsList(params, theme)` (time / legacy-proxy branches), `useDocumentsListQuery`, and the actions (`fetchDocumentUrl`, `openDocument`, `useOpenDocumentAction`). `openDocument` currently always calls `fetchDocumentUrl` (ERP wrapper) then `window.open`.

- [ ] **Step 1: Write the failing test** — create `src/test/hooks/fetch-documents-list-vinc.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@framework/utils/httpB2B', () => ({ post: vi.fn() }));

import {
  fetchDocumentsList,
  openDocument,
} from '@framework/documents/fetch-documents-list';
import { post } from '@framework/utils/httpB2B';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.clearAllMocks());

const base = { date_from: '01052026', date_to: '31052026', customer_code: '015892' };

describe('fetchDocumentsList — default (VINC) branch', () => {
  it('DDT → /api/profile/delivery_note, maps to DDT rows with barcode url', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          available: true,
          items: [
            {
              _id: 'd1',
              data: {
                numero_ddt: '111',
                numero_documento: 'DDT/2026/111',
                data: '2026-05-10',
                destinazione: { label: 'SEDE' },
                pdf_barcode_url: 'https://cs/bc.pdf',
              },
            },
          ],
        }),
      } as any;
    });
    const rows = await fetchDocumentsList({ ...base, type: 'DDT' } as any, 'default');
    expect(calls[0]).toContain('/api/profile/delivery_note');
    expect(calls[0]).toContain('relation_id=015892');
    expect(calls[0]).toContain('2026-05-01'); // date_from → ISO
    expect(rows).toHaveLength(1);
    expect(rows[0].doc_type).toBe('DDT');
    expect(rows[0].document).toBe('DDT/2026/111');
    expect(rows[0].barcodePdf).toBe('https://cs/bc.pdf');
  });

  it('F → /api/profile/invoice, maps to F rows', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        available: true,
        items: [
          { _id: 'i1', data: { numero_fattura: '900', numero_documento: 'F/2026/900', data: '2026-05-10', csv_url: 'https://cs/x.csv' } },
        ],
      }),
    })) as any;
    const rows = await fetchDocumentsList({ ...base, type: 'F' } as any, 'default');
    expect(rows[0].doc_type).toBe('F');
    expect(rows[0].csv).toBe('https://cs/x.csv');
  });

  it('returns [] when the model is unavailable', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ available: false, items: [] }),
    })) as any;
    const rows = await fetchDocumentsList({ ...base, type: 'F' } as any, 'default');
    expect(rows).toEqual([]);
  });
});

describe('openDocument — VINC direct urls', () => {
  it('opens the row direct url and does NOT call the ERP wrapper', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null as any);
    await openDocument('csv', {
      doc_type: 'F',
      csv: 'https://cs/x.csv',
    } as any);
    expect(openSpy).toHaveBeenCalledWith(
      'https://cs/x.csv',
      '_blank',
      'noopener,noreferrer',
    );
    expect(post).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/hooks/fetch-documents-list-vinc.test.ts`
Expected: FAIL — default branch still calls the proxy; `openDocument` always calls the wrapper.

- [ ] **Step 3: Add imports** at the top of `src/framework/basic-rest/documents/fetch-documents-list.ts`:

```ts
import { sourcePolicy } from '@framework/profile/source-policy';
import { fetchProfileRecords } from '@framework/profile/vinc-profile-client';
import {
  ddmmyyyyToIso,
  pickDirectUrl,
  vincDeliveryNoteToRow,
  vincInvoiceToRow,
  type VincDeliveryNoteRecord,
  type VincInvoiceRecord,
} from '@utils/transform/vinc-document';
```

- [ ] **Step 4: Add the VINC branch** as the FIRST statement inside `fetchDocumentsList`, before the existing `const payload = toErpPayload(params);`:

```ts
  // default theme → VINC data-model (empty state if unavailable; no proxy fallback)
  if (sourcePolicy(theme).account === 'vinc') {
    const model = params.type === 'DDT' ? 'delivery_note' : 'invoice';
    const result = await fetchProfileRecords(model, {
      relation_id: params.customer_code,
      date_from: ddmmyyyyToIso(params.date_from),
      date_to: ddmmyyyyToIso(params.date_to),
      limit: 50,
    });
    if (!result.available) return [];
    return params.type === 'DDT'
      ? (result.items as VincDeliveryNoteRecord[]).map(vincDeliveryNoteToRow)
      : (result.items as VincInvoiceRecord[]).map(vincInvoiceToRow);
  }
```

Leave the existing `time` and legacy-proxy code after this point unchanged.

- [ ] **Step 5: Prefer the direct URL in `openDocument`.** Replace the existing `openDocument` function body so it opens a row's VINC URL when present, else falls back to the ERP wrapper:

```ts
export async function openDocument(
  kind: DocumentActionKind,
  row: DocumentRow,
): Promise<void> {
  // Guardrail: DDT → only barcode
  if (row.doc_type === 'DDT' && kind !== 'barcode') {
    throw new Error('Per i DDT è disponibile solo il PDF con codice a barre.');
  }

  // VINC rows carry the document URL directly; otherwise use the ERP wrapper.
  const direct = pickDirectUrl(kind, row);
  const url = direct || (await fetchDocumentUrl(kind, row));

  if (typeof window !== 'undefined' && url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
```

- [ ] **Step 6: Add `theme` to the query key** so VINC/ERP/time caches never collide. In `useDocumentsListQuery`, change the `queryKey` to include `theme`:

```ts
    queryKey: [
      pickListEndpoint(params.type),
      theme,
      params.type,
      params.date_from,
      params.date_to,
    ],
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test src/test/hooks/fetch-documents-list-vinc.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add src/framework/basic-rest/documents/fetch-documents-list.ts src/test/hooks/fetch-documents-list-vinc.test.ts
git commit --no-verify -m "feat(profile): documents (DDT/invoice) VINC branch + VINC-url actions on default theme"
```

---

## Task 4: Manual verification (live app)

**Files:** none.

- [ ] **Step 1: Run the new suites**

Run: `pnpm test src/test/unit/vinc-data-models-query.test.ts src/test/unit/vinc-document.test.ts src/test/hooks/fetch-documents-list-vinc.test.ts src/test/api/profile-route.test.ts`
Expected: all PASS. (Pre-existing unrelated `src/test/api/forms-submit-route.test.ts` failures are not introduced here.)

- [ ] **Step 2: Observe in the running app** (needs `pnpm dev` + a logged-in default-theme customer with DDT/invoice data)

- Go to `/<lang>/account/documents`. On the **Fatture** tab: network shows `GET /api/profile/invoice?relation_id=…&filter[data][gte]=…`; rows show readable document numbers; the date pickers actually filter (because the query now uses `filter[data]`, not `document_date`).
- Click **PDF / PDF▮▮ / CSV** → a new tab opens the VINC URL directly (no `POST /api/proxy/b2b/wrapper/*` call).
- Switch to the **DDT** tab: `GET /api/profile/delivery_note…`; only the barcode action shows and opens the VINC `pdf_barcode_url`.
- A customer/model with no data shows "Nessun documento trovato" and makes no legacy proxy call.

- [ ] **Step 3: Confirm `time` theme unchanged** — on a time-theme tenant the documents page still loads via `/api/erp/get_ddt` / `/api/erp/get_invoices` and actions via the wrapper; no `/api/profile/*` calls.

---

## Self-Review (completed by plan author)

**Spec coverage (§6.3 delivery_note, §6.4 invoice):** list mapping → Task 2 (`vincDeliveryNoteToRow`/`vincInvoiceToRow` → `DocumentRow`); model selection by tab type → Task 3; the §6.3/§6.4 **document-actions open question is resolved** — VINC provides `pdf_url`/`pdf_barcode_url`/`csv_url`, opened directly via `pickDirectUrl` (Task 2) + `openDocument` (Task 3); date filtering on the correct field → Task 1 (`PROFILE_MODEL_DATE_FIELD` + parameterized `buildRecordsQuery`); empty-state-not-fallback → Task 3 (`return []`); `time`/proxy untouched → Tasks 3/4. Richer invoice UI (scadenze/payment status) remains out of scope per §6.4. `credit_exposure` (§6.2) is intentionally **not** in this plan (generic `lines[]`+totals shape needs a code→`Exposition` mapping / sample data — separate follow-up).

**Placeholder scan:** none — every code step shows full code; commands + expected results concrete.

**Type consistency:** `PROFILE_MODEL_DATE_FIELD`, `buildRecordsQuery(p, dateField)`, `vincDeliveryNoteToRow`/`vincInvoiceToRow`/`pickDirectUrl`/`isoToDmy`/`ddmmyyyyToIso`, `VincDeliveryNoteRecord`/`VincInvoiceRecord`, and `DocumentRow` (with `pdf?`/`barcodePdf?`/`csv?`) are used with identical names across Tasks 1–3. `DocumentActionKind` (`'pdf'|'barcode'|'csv'`) matches `DirectKind`.

**Regression note:** the existing `profile-route.test.ts` param-wiring test and `fetch-orders-list-vinc.test.ts` exercise `historical_order` → `document_date` (the default), so the new `dateField` arg (defaulted) does not change their expectations.
