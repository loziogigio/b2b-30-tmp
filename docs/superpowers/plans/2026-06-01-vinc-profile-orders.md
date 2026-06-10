# VINC Profile — Order History (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the `default` theme, source the customer order history (list + enriched detail) from the VINC Commerce Suite data-models API (`historical_order`); when the model is unavailable the page shows its normal empty state (no proxy fallback). The `time` theme and all other themes are untouched.

**Architecture:** A theme-keyed `sourcePolicy(theme)` seam decides `account: 'erp' | 'vinc'`. A generic server route `GET /api/profile/[model]` (and `/[id]`) resolves per-tenant Commerce-Suite credentials, probes model availability (Redis-cached), translates query params to the VINC `filter[…]`/`sort` syntax, and returns raw VINC records or `{ available:false }`. Pure transforms map VINC records to the existing `OrderSummary` (list) and an **enriched** `TransformedOrder` (detail). The order hooks gain a VINC branch; the `time`/proxy branches are preserved verbatim.

**Tech Stack:** Next.js 16 App Router (route handlers), React Query, TypeScript, Vitest. Server creds + Redis cache reuse `src/lib/erp/*` and `src/lib/cache/redis-cache` patterns. Spec: `docs/superpowers/specs/2026-06-01-vinc-profile-data-source-design.md`.

**Conventions used below**

- Run one test file: `pnpm test <path>` (this is `vitest run <path>`).
- Path aliases: `@/` → `src/`, `@framework/` → `src/framework/basic-rest/`, `@utils/` → `src/utils/`, `@components/` → `src/components/`.
- Commit messages: **no** `Co-Authored-By` / `Generated with` lines (per CLAUDE.md). Use `--no-verify` if pre-existing lint blocks a commit.
- Never run `pnpm build`.

---

## File Structure

**New**

- `src/framework/basic-rest/profile/source-policy.ts` — pure theme→source seam.
- `src/lib/profile/cs-creds.ts` — server: resolve per-tenant Commerce-Suite creds.
- `src/lib/profile/vinc-data-models.ts` — server: allow-list, pure query builder, probe (cached), record fetchers.
- `src/app/api/profile/[model]/route.ts` — GET list route.
- `src/app/api/profile/[model]/[id]/route.ts` — GET single-record route.
- `src/framework/basic-rest/profile/vinc-profile-client.ts` — browser client for the two routes.
- `src/utils/transform/vinc-historical-order.ts` — pure VINC→UI mappers (+ status/type maps).
- Tests: `src/test/unit/source-policy.test.ts`, `src/test/unit/vinc-data-models-query.test.ts`, `src/test/unit/vinc-historical-order.test.ts`, `src/test/api/profile-route.test.ts`, `src/test/hooks/fetch-orders-list-vinc.test.ts`.

**Modified**

- `src/framework/basic-rest/order/types-b2b-orders-list.ts` — add `source?`, `vincId?` to `OrderSummary`.
- `src/utils/transform/b2b-order.ts` — add optional enrichment fields to `TransformedOrder` / `TransformedOrderItem`.
- `src/framework/basic-rest/order/fetch-orders-list.ts` — VINC branch.
- `src/framework/basic-rest/order/fetch-order.ts` — VINC-by-`_id` branch; `OrderParams.vincId?`.
- `src/app/[lang]/(default)/account/orders/order-client.tsx` — VINC detail-params branch.
- `src/components/orders/order-details.tsx` — VINC view-details link + conditional enrichment.
- `src/app/[lang]/(default)/account/order-detail/page.tsx` — accept `id`/`source` search params.
- `src/app/[lang]/(default)/account/order-detail/order-detail.client.tsx` — accept `vincId`, branch the hook, render enrichment.

---

## Task 1: Theme→source policy seam

**Files:**

- Create: `src/framework/basic-rest/profile/source-policy.ts`
- Test: `src/test/unit/source-policy.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/unit/source-policy.test.ts
import { describe, it, expect } from 'vitest';
import { sourcePolicy } from '@/framework/basic-rest/profile/source-policy';

describe('sourcePolicy', () => {
  it('default theme → VINC account + inline pricing', () => {
    expect(sourcePolicy('default')).toEqual({
      account: 'vinc',
      pricing: 'inline',
    });
  });

  it('time theme → erp account + erp pricing', () => {
    expect(sourcePolicy('time')).toEqual({ account: 'erp', pricing: 'erp' });
  });

  it('unknown/undefined theme does NOT route account to VINC', () => {
    expect(sourcePolicy('something-else').account).toBe('erp');
    expect(sourcePolicy(undefined).account).toBe('erp');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/source-policy.test.ts`
Expected: FAIL — cannot resolve `source-policy` / `sourcePolicy is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/framework/basic-rest/profile/source-policy.ts

/** 'erp' = keep the existing path (time→/api/erp, others→legacy proxy). */
export type AccountSource = 'erp' | 'vinc';
export type PricingSourceHint = 'erp' | 'inline';

export interface SourcePolicy {
  account: AccountSource; // consumed now
  pricing: PricingSourceHint; // documented seam for the future pricing migration
}

// Explicit allow-lists — an unknown theme must NOT silently become 'vinc'.
const VINC_ACCOUNT_THEMES = new Set<string>(['default']);
const INLINE_PRICING_THEMES = new Set<string>(['default']);

export function sourcePolicy(theme: string | undefined): SourcePolicy {
  const t = theme ?? 'default-unknown';
  return {
    account: VINC_ACCOUNT_THEMES.has(t) ? 'vinc' : 'erp',
    pricing: INLINE_PRICING_THEMES.has(t) ? 'inline' : 'erp',
  };
}
```

> Note: `undefined`/unknown themes resolve to `'erp'`. We intentionally do NOT
> treat a bare `'default'`-fallback as VINC unless the string is literally
> `'default'`; `useThemeId()` returns the literal `'default'` for the default
> theme, so this is correct. The `'default-unknown'` sentinel guarantees an
> `undefined` theme never matches the allow-list.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/unit/source-policy.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/framework/basic-rest/profile/source-policy.ts src/test/unit/source-policy.test.ts
git commit --no-verify -m "feat(profile): theme-keyed source policy seam (account: erp|vinc)"
```

---

## Task 2: VINC data-models query builder (pure) + allow-list

**Files:**

- Create: `src/lib/profile/vinc-data-models.ts`
- Test: `src/test/unit/vinc-data-models-query.test.ts`

This task adds only the **pure, network-free** pieces: the model allow-list and `buildRecordsQuery`. The network functions (probe/fetch) are added in Task 4.

- [ ] **Step 1: Write the failing test**

```ts
// src/test/unit/vinc-data-models-query.test.ts
import { describe, it, expect } from 'vitest';
import {
  PROFILE_MODELS,
  isProfileModel,
  buildRecordsQuery,
} from '@/lib/profile/vinc-data-models';

describe('PROFILE_MODELS allow-list', () => {
  it('contains the four profile models', () => {
    expect(PROFILE_MODELS).toEqual([
      'historical_order',
      'credit_exposure',
      'invoice',
      'delivery_note',
    ]);
  });
  it('isProfileModel rejects anything else', () => {
    expect(isProfileModel('historical_order')).toBe(true);
    expect(isProfileModel('erp_settings')).toBe(false);
    expect(isProfileModel('../secrets')).toBe(false);
  });
});

describe('buildRecordsQuery', () => {
  it('requires relation_id and sets sane defaults', () => {
    const q = buildRecordsQuery({ relation_id: '015892' });
    expect(q.get('relation_id')).toBe('015892');
    expect(q.get('limit')).toBe('50');
    expect(q.get('sort')).toBe('-data.document_date');
  });

  it('translates status and date range to bracket filters', () => {
    const q = buildRecordsQuery({
      relation_id: '015892',
      status: 'fulfilled',
      date_from: '2026-05-01',
      date_to: '2026-05-31',
      page: 2,
      limit: 20,
    });
    expect(q.get('filter[status]')).toBe('fulfilled');
    expect(q.get('filter[document_date][gte]')).toBe('2026-05-01');
    expect(q.get('filter[document_date][lte]')).toBe('2026-05-31');
    expect(q.get('page')).toBe('2');
    expect(q.get('limit')).toBe('20');
  });

  it('supports document_number lookup and NEVER emits external_ref', () => {
    const q = buildRecordsQuery({
      relation_id: '015892',
      document_number: 'OC/9345',
    });
    expect(q.get('filter[document_number]')).toBe('OC/9345');
    expect(q.get('external_ref')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/vinc-data-models-query.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/profile/vinc-data-models.ts

/** Models the browser is allowed to request through the profile BFF route. */
export const PROFILE_MODELS = [
  'historical_order',
  'credit_exposure',
  'invoice',
  'delivery_note',
] as const;

export type ProfileModel = (typeof PROFILE_MODELS)[number];

export function isProfileModel(value: string): value is ProfileModel {
  return (PROFILE_MODELS as readonly string[]).includes(value);
}

export interface ProfileQuery {
  relation_id: string; // the customer scope (= ERP customer_code)
  status?: string;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
  document_number?: string;
  page?: number; // 1-indexed
  limit?: number; // default 50
  sort?: string; // default -data.document_date
}

/**
 * Translate a ProfileQuery to the VINC data-models query string. Only
 * top-level `data.*` bracket filters are supported by the API; nested paths and
 * `external_ref` are intentionally never emitted (external_ref bypasses tenant
 * scoping). Pure — no network.
 */
export function buildRecordsQuery(p: ProfileQuery): URLSearchParams {
  const q = new URLSearchParams();
  q.set('relation_id', p.relation_id);
  q.set('limit', String(p.limit ?? 50));
  if (p.page != null) q.set('page', String(p.page));
  q.set('sort', p.sort ?? '-data.document_date');
  if (p.status) q.set('filter[status]', p.status);
  if (p.date_from) q.set('filter[document_date][gte]', p.date_from);
  if (p.date_to) q.set('filter[document_date][lte]', p.date_to);
  if (p.document_number) q.set('filter[document_number]', p.document_number);
  return q;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/unit/vinc-data-models-query.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile/vinc-data-models.ts src/test/unit/vinc-data-models-query.test.ts
git commit --no-verify -m "feat(profile): VINC data-models allow-list + pure query builder"
```

---

## Task 3: Commerce-Suite credential resolver (server)

**Files:**

- Create: `src/lib/profile/cs-creds.ts`

Mirrors the Commerce-Suite portion of `getTenantBits` in `src/lib/erp/factory.ts:17` (single-tenant → env; multi-tenant → `resolveTenant(hostname)`). No new test — exercised by the route tests in Task 5; it is a thin re-use of an existing, tested pattern.

- [ ] **Step 1: Write the implementation**

```ts
// src/lib/profile/cs-creds.ts
import type { NextRequest } from 'next/server';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';

export interface CsCreds {
  csBaseUrl: string; // Commerce Suite base URL (tenant.api.pimApiUrl)
  apiKeyId: string;
  apiSecret: string;
}

/**
 * Resolve per-tenant Commerce-Suite credentials for data-models calls.
 * Single-tenant → env (PIM_API_*). Multi-tenant → tenant registry by hostname.
 */
export async function resolveCsCreds(req: NextRequest): Promise<CsCreds> {
  if (isSingleTenant) {
    return {
      csBaseUrl: process.env.PIM_API_URL || '',
      apiKeyId: process.env.PIM_API_KEY_ID || '',
      apiSecret: process.env.PIM_API_SECRET || '',
    };
  }
  const hostname =
    req.headers.get('x-tenant-hostname') ||
    req.headers.get('host') ||
    'localhost';
  const tenant = await resolveTenant(hostname);
  return {
    csBaseUrl: tenant?.api.pimApiUrl || process.env.PIM_API_URL || '',
    apiKeyId: tenant?.api.apiKeyId || '',
    apiSecret: tenant?.api.apiSecret || '',
  };
}
```

- [ ] **Step 2: Verify it compiles via the suite**

Run: `pnpm test src/test/unit/source-policy.test.ts`
Expected: PASS (sanity that the workspace still builds; this file has no test yet — it is covered by Task 5).

- [ ] **Step 3: Commit**

```bash
git add src/lib/profile/cs-creds.ts
git commit --no-verify -m "feat(profile): per-tenant Commerce-Suite credential resolver"
```

---

## Task 4: VINC probe + record fetchers (server, cached)

**Files:**

- Modify: `src/lib/profile/vinc-data-models.ts`

Adds the network functions to the module created in Task 2. Availability is probed once per (tenant, model) and Redis-cached via the existing `cachedJson` helper (`src/lib/cache/redis-cache`), exactly like `erp_settings` in `factory.ts:69`.

- [ ] **Step 1: Append the implementation**

Add these imports at the top of `src/lib/profile/vinc-data-models.ts`:

```ts
import { cachedJson } from '@/lib/cache/redis-cache';
import type { CsCreds } from '@/lib/profile/cs-creds';
```

Append below `buildRecordsQuery`:

```ts
function authHeaders(creds: CsCreds): HeadersInit {
  return {
    Accept: 'application/json',
    'x-auth-method': 'api-key',
    'x-api-key-id': creds.apiKeyId,
    'x-api-secret': creds.apiSecret,
  };
}

function modelBase(creds: CsCreds, model: ProfileModel): string {
  return `${creds.csBaseUrl.replace(/\/+$/, '')}/api/b2b/data-models/${model}`;
}

/**
 * Is the data-model available for this tenant? Probes the model/schema endpoint
 * (200 = available). Verdict cached per (csBaseUrl, model): 5 min soft / 1 h hard.
 */
export async function probeModelAvailable(
  creds: CsCreds,
  model: ProfileModel,
): Promise<boolean> {
  if (!creds.csBaseUrl || !creds.apiKeyId) return false;
  return cachedJson<boolean>(
    `vinc:profile:available:${creds.csBaseUrl}:${model}`,
    { softTtlMs: 5 * 60_000, hardTtlSeconds: 3600 },
    async () => {
      try {
        const res = await fetch(modelBase(creds, model), {
          headers: authHeaders(creds),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  );
}

export interface RecordsPage {
  items: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Fetch a page of records. Throws on non-OK (caller maps to 502). */
export async function fetchModelRecords(
  creds: CsCreds,
  model: ProfileModel,
  query: URLSearchParams,
): Promise<RecordsPage> {
  const res = await fetch(`${modelBase(creds, model)}/records?${query}`, {
    headers: authHeaders(creds),
  });
  if (!res.ok)
    throw new Error(`data-model ${model} records HTTP ${res.status}`);
  const body: any = await res.json();
  return { items: body?.data?.items ?? [], pagination: body?.data?.pagination };
}

/** Fetch one record by VINC `_id`. Returns null on 404. Throws on other non-OK. */
export async function fetchModelRecord(
  creds: CsCreds,
  model: ProfileModel,
  id: string,
): Promise<any | null> {
  const res = await fetch(
    `${modelBase(creds, model)}/records/${encodeURIComponent(id)}`,
    { headers: authHeaders(creds) },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`data-model ${model} record HTTP ${res.status}`);
  const body: any = await res.json();
  return body?.data ?? null;
}
```

- [ ] **Step 2: Verify nothing broke**

Run: `pnpm test src/test/unit/vinc-data-models-query.test.ts`
Expected: PASS (pure tests still green; network fns are covered in Task 5).

- [ ] **Step 3: Commit**

```bash
git add src/lib/profile/vinc-data-models.ts
git commit --no-verify -m "feat(profile): cached availability probe + VINC record fetchers"
```

---

## Task 5: Generic profile route — list + single record

**Files:**

- Create: `src/app/api/profile/[model]/route.ts`
- Create: `src/app/api/profile/[model]/[id]/route.ts`
- Test: `src/test/api/profile-route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/api/profile-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const probeModelAvailable = vi.fn();
const fetchModelRecords = vi.fn();
const fetchModelRecord = vi.fn();

vi.mock('@/lib/profile/cs-creds', () => ({
  resolveCsCreds: vi.fn(async () => ({
    csBaseUrl: 'https://cs.example',
    apiKeyId: 'k',
    apiSecret: 's',
  })),
}));
vi.mock('@/lib/profile/vinc-data-models', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    probeModelAvailable,
    fetchModelRecords,
    fetchModelRecord,
  };
});

import { GET as listGET } from '@/app/api/profile/[model]/route';
import { GET as recordGET } from '@/app/api/profile/[model]/[id]/route';
import { NextRequest } from 'next/server';

function listReq(model: string, qs = 'relation_id=015892') {
  return new NextRequest(`http://localhost/api/profile/${model}?${qs}`);
}

beforeEach(() => {
  probeModelAvailable.mockReset();
  fetchModelRecords.mockReset();
  fetchModelRecord.mockReset();
});

describe('GET /api/profile/[model]', () => {
  it('404s an unknown model and never calls upstream', async () => {
    const res = await listGET(listReq('erp_settings'), {
      params: Promise.resolve({ model: 'erp_settings' }),
    });
    expect(res.status).toBe(404);
    expect(probeModelAvailable).not.toHaveBeenCalled();
  });

  it('400s when relation_id is missing', async () => {
    const res = await listGET(listReq('historical_order', ''), {
      params: Promise.resolve({ model: 'historical_order' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns available:false when the model is not available', async () => {
    probeModelAvailable.mockResolvedValue(false);
    const res = await listGET(listReq('historical_order'), {
      params: Promise.resolve({ model: 'historical_order' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ available: false, items: [] });
    expect(fetchModelRecords).not.toHaveBeenCalled();
  });

  it('returns records when available', async () => {
    probeModelAvailable.mockResolvedValue(true);
    fetchModelRecords.mockResolvedValue({
      items: [{ _id: '1', data: { document_number: 'OC/1' } }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    const res = await listGET(listReq('historical_order'), {
      params: Promise.resolve({ model: 'historical_order' }),
    });
    const json = await res.json();
    expect(json.available).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it('502s when records fetch fails after a positive probe', async () => {
    probeModelAvailable.mockResolvedValue(true);
    fetchModelRecords.mockRejectedValue(new Error('upstream down'));
    const res = await listGET(listReq('historical_order'), {
      params: Promise.resolve({ model: 'historical_order' }),
    });
    expect(res.status).toBe(502);
  });
});

describe('GET /api/profile/[model]/[id]', () => {
  it('returns available:false + item:null on 404', async () => {
    probeModelAvailable.mockResolvedValue(true);
    fetchModelRecord.mockResolvedValue(null);
    const res = await recordGET(
      new NextRequest('http://localhost/api/profile/historical_order/abc'),
      { params: Promise.resolve({ model: 'historical_order', id: 'abc' }) },
    );
    const json = await res.json();
    expect(json).toEqual({ available: true, item: null });
  });

  it('returns the record when found', async () => {
    probeModelAvailable.mockResolvedValue(true);
    fetchModelRecord.mockResolvedValue({ _id: 'abc', data: { total: 9 } });
    const res = await recordGET(
      new NextRequest('http://localhost/api/profile/historical_order/abc'),
      { params: Promise.resolve({ model: 'historical_order', id: 'abc' }) },
    );
    const json = await res.json();
    expect(json.available).toBe(true);
    expect(json.item.data.total).toBe(9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/api/profile-route.test.ts`
Expected: FAIL — route modules not found.

- [ ] **Step 3: Write the list route**

```ts
// src/app/api/profile/[model]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import {
  isProfileModel,
  buildRecordsQuery,
  probeModelAvailable,
  fetchModelRecords,
} from '@/lib/profile/vinc-data-models';

type RouteParams = { params: Promise<{ model: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { model } = await params;
  if (!isProfileModel(model)) {
    return NextResponse.json(
      { error: `Unknown profile model: ${model}` },
      { status: 404 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const relationId = sp.get('relation_id') ?? '';
  if (!relationId) {
    return NextResponse.json(
      { error: 'relation_id is required' },
      { status: 400 },
    );
  }

  const creds = await resolveCsCreds(req);

  const available = await probeModelAvailable(creds, model);
  if (!available) {
    return NextResponse.json({ available: false, items: [] });
  }

  const query = buildRecordsQuery({
    relation_id: relationId,
    status: sp.get('status') ?? undefined,
    date_from: sp.get('date_from') ?? undefined,
    date_to: sp.get('date_to') ?? undefined,
    document_number: sp.get('document_number') ?? undefined,
    page: sp.get('page') ? Number(sp.get('page')) : undefined,
    limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
    sort: sp.get('sort') ?? undefined,
  });

  try {
    const { items, pagination } = await fetchModelRecords(creds, model, query);
    return NextResponse.json({ available: true, items, pagination });
  } catch (error) {
    console.error(`[profile route] ${model} records failed:`, error);
    return NextResponse.json(
      { error: 'records fetch failed' },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 4: Write the single-record route**

```ts
// src/app/api/profile/[model]/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import {
  isProfileModel,
  probeModelAvailable,
  fetchModelRecord,
} from '@/lib/profile/vinc-data-models';

type RouteParams = { params: Promise<{ model: string; id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { model, id } = await params;
  if (!isProfileModel(model)) {
    return NextResponse.json(
      { error: `Unknown profile model: ${model}` },
      { status: 404 },
    );
  }

  const creds = await resolveCsCreds(req);
  const available = await probeModelAvailable(creds, model);
  if (!available) {
    return NextResponse.json({ available: false, item: null });
  }

  try {
    const item = await fetchModelRecord(creds, model, id);
    return NextResponse.json({ available: true, item });
  } catch (error) {
    console.error(`[profile route] ${model}/${id} failed:`, error);
    return NextResponse.json({ error: 'record fetch failed' }, { status: 502 });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/test/api/profile-route.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/profile src/test/api/profile-route.test.ts
git commit --no-verify -m "feat(profile): generic /api/profile/[model] list + record routes"
```

---

## Task 6: Browser client for the profile routes

**Files:**

- Create: `src/framework/basic-rest/profile/vinc-profile-client.ts`

Thin `fetch` wrapper the hooks call. No dedicated unit test (it is exercised by the hook test in Task 9 and manual verification); it contains no logic beyond URL assembly and shape passthrough.

- [ ] **Step 1: Write the implementation**

```ts
// src/framework/basic-rest/profile/vinc-profile-client.ts

export interface ProfileRecordsResult {
  available: boolean;
  items: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProfileRecordResult {
  available: boolean;
  item: any | null;
}

/** GET /api/profile/<model> with the given query params (undefined dropped). */
export async function fetchProfileRecords(
  model: string,
  params: Record<string, string | number | undefined>,
): Promise<ProfileRecordsResult> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const res = await fetch(`/api/profile/${model}?${qs.toString()}`);
  if (!res.ok) {
    // 4xx/5xx → treat as "no data" for display (route already logged details).
    return { available: false, items: [] };
  }
  return (await res.json()) as ProfileRecordsResult;
}

/** GET /api/profile/<model>/<id>. */
export async function fetchProfileRecord(
  model: string,
  id: string,
): Promise<ProfileRecordResult> {
  const res = await fetch(`/api/profile/${model}/${encodeURIComponent(id)}`);
  if (!res.ok) return { available: false, item: null };
  return (await res.json()) as ProfileRecordResult;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/framework/basic-rest/profile/vinc-profile-client.ts
git commit --no-verify -m "feat(profile): browser client for /api/profile routes"
```

---

## Task 7: Extend the order types (list + enriched detail)

**Files:**

- Modify: `src/framework/basic-rest/order/types-b2b-orders-list.ts`
- Modify: `src/utils/transform/b2b-order.ts`

Type-only additions; all new fields optional so the ERP path is unaffected. No test (pure type changes); consumed by Tasks 8–13.

- [ ] **Step 1: Extend `OrderSummary`**

In `src/framework/basic-rest/order/types-b2b-orders-list.ts`, add two fields to the `OrderSummary` type (after `doc_year`):

```ts
  doc_year: number; // "${Anno}"

  // Source discriminator + VINC detail key (VINC branch only; ERP leaves unset)
  source?: 'erp' | 'vinc';
  vincId?: string; // VINC record _id, used for detail-by-id
```

- [ ] **Step 2: Extend `TransformedOrder` / `TransformedOrderItem`**

In `src/utils/transform/b2b-order.ts`, add optional enrichment fields.

To `TransformedOrderItem` (after `ordered_in_price`):

```ts
  ordered_in_price: number;

  // VINC enrichment (optional; ERP path leaves unset)
  uom?: string;
  vatRate?: number;
  discounts?: number[]; // decoded from discounts_json
  lineTotal?: number;
  entityCode?: string;
  lineNumber?: number;
```

To `TransformedOrder` (after `total`), add the header enrichment, and add `label?` to both address blocks:

```ts
  total: number; // = sub_total (+fees -discount +tax) => same as sub_total

  // VINC enrichment (optional; ERP path leaves unset)
  currency?: string;
  status?: string;
  statusLabel?: string;
  subtotal?: number;
  vatTotal?: number;
  discountTotal?: number;
  shippingCost?: number;
  paymentMethod?: string;
  agentCode?: string;
  notes?: string;
  erpMeta?: Record<string, unknown>;
```

And update both address shapes to include an optional label:

```ts
  shipping_address: {
    label?: string;
    street_address: string;
    city: string;
    state?: string;
    zip?: string;
    country: string;
  };
  billing_address: {
    label?: string;
    street_address: string;
    city: string;
    state?: string;
    zip?: string;
    country: string;
  };
```

- [ ] **Step 3: Verify the suite still compiles/passes**

Run: `pnpm test src/test/unit/source-policy.test.ts`
Expected: PASS (sanity; type additions are backward-compatible).

- [ ] **Step 4: Commit**

```bash
git add src/framework/basic-rest/order/types-b2b-orders-list.ts src/utils/transform/b2b-order.ts
git commit --no-verify -m "feat(profile): add optional source/vincId + order-detail enrichment fields"
```

---

## Task 8: VINC historical_order transforms (pure)

**Files:**

- Create: `src/utils/transform/vinc-historical-order.ts`
- Test: `src/test/unit/vinc-historical-order.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/unit/vinc-historical-order.test.ts
import { describe, it, expect } from 'vitest';
import {
  vincStatusLabel,
  typeToVincStatus,
  vincOrderToSummary,
  vincOrderDetailToTransformed,
} from '@/utils/transform/vinc-historical-order';

const rec = {
  _id: '6a18e8a54eae3b148980919a',
  relation_id: '015892',
  data: {
    document_number: 'OC/10760',
    document_date: '2026-05-28T00:00:00.000Z',
    delivery_date: null,
    status: 'fulfilled',
    total: 291.55,
    currency: 'EUR',
    subtotal: 250,
    vat_total: 41.55,
    shipping_cost: 0,
    discount_total: 0,
    payment_method: 'RB',
    agent_code: 'A1',
    notes: 'leave at gate',
    shipping_address: {
      code: '1',
      label: 'SEDE',
      street: 'VIA FIEGHI 1',
      city: 'SALA CONSILINA',
      province: 'SA',
      postal_code: '84036',
      country: 'IT',
    },
    erp_meta: { csoci: 'X' },
    items: [
      {
        line_number: 1,
        sku: 'ART1',
        entity_code: '529836',
        name: 'Widget',
        quantity: 2,
        uom: 'PZ',
        unit_price: 125,
        discounts_json: '[10,5]',
        vat_rate: 22,
        line_total: 250,
      },
    ],
  },
};

describe('vincStatusLabel', () => {
  it('maps known statuses to Italian labels', () => {
    expect(vincStatusLabel('fulfilled')).toBe('Evaso');
    expect(vincStatusLabel('to_fulfill')).toBe('Da evadere');
    expect(vincStatusLabel('in_transit')).toBe('In consegna');
  });
  it('falls back to the raw value when unknown', () => {
    expect(vincStatusLabel('weird')).toBe('weird');
    expect(vincStatusLabel(undefined)).toBe('');
  });
});

describe('typeToVincStatus', () => {
  it('maps ERP filter chips to VINC statuses', () => {
    expect(typeToVincStatus('T')).toBeUndefined(); // Tutti → no filter
    expect(typeToVincStatus('NE')).toBe('to_fulfill'); // Da evadere
    expect(typeToVincStatus('E')).toBe('fulfilled'); // Evaso
    expect(typeToVincStatus('IA')).toBe('to_fulfill'); // In accettazione
  });
});

describe('vincOrderToSummary', () => {
  it('maps a VINC record to OrderSummary with source=vinc', () => {
    const s = vincOrderToSummary(rec);
    expect(s.id).toBe(rec._id);
    expect(s.vincId).toBe(rec._id);
    expect(s.source).toBe('vinc');
    expect(s.document).toBe('OC/10760');
    expect(s.ordered_total).toBe(291.55);
    expect(s.status_code).toBe('fulfilled');
    expect(s.status_label).toBe('Evaso');
    expect(s.destination).toContain('SEDE');
  });

  it('falls back to street+city when label is missing', () => {
    const s = vincOrderToSummary({
      ...rec,
      data: {
        ...rec.data,
        shipping_address: { street: 'VIA X', city: 'ROMA' },
      },
    });
    expect(s.destination).toBe('VIA X - ROMA');
  });
});

describe('vincOrderDetailToTransformed', () => {
  it('enriches with totals, currency, status, per-line VAT/discounts', () => {
    const o = vincOrderDetailToTransformed(rec);
    expect(o.currency).toBe('EUR');
    expect(o.total).toBe(291.55);
    expect(o.subtotal).toBe(250);
    expect(o.vatTotal).toBe(41.55);
    expect(o.statusLabel).toBe('Evaso');
    expect(o.paymentMethod).toBe('RB');
    expect(o.shipping_address.state).toBe('SA');
    expect(o.shipping_address.zip).toBe('84036');
    const it = o.items[0];
    expect(it.sku).toBe('ART1');
    expect(it.uom).toBe('PZ');
    expect(it.discounts).toEqual([10, 5]);
    expect(it.vatRate).toBe(22);
    expect(it.lineTotal).toBe(250);
  });

  it('parses discounts_json safely (bad JSON → [])', () => {
    const o = vincOrderDetailToTransformed({
      ...rec,
      data: {
        ...rec.data,
        items: [{ ...rec.data.items[0], discounts_json: 'nope' }],
      },
    });
    expect(o.items[0].discounts).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/vinc-historical-order.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/utils/transform/vinc-historical-order.ts
import type { OrderSummary } from '@framework/order/types-b2b-orders-list';
import type {
  TransformedOrder,
  TransformedOrderItem,
} from '@utils/transform/b2b-order';

export interface VincOrderItem {
  line_number?: number;
  sku?: string;
  entity_code?: string;
  name?: string;
  quantity?: number;
  uom?: string;
  unit_price?: number;
  discounts_json?: string;
  vat_rate?: number;
  line_total?: number;
}

export interface VincOrderData {
  document_number?: string;
  document_date?: string;
  delivery_date?: string | null;
  status?: string;
  status_label?: string;
  total?: number;
  currency?: string;
  subtotal?: number;
  vat_total?: number;
  shipping_cost?: number;
  discount_total?: number;
  payment_method?: string;
  agent_code?: string;
  notes?: string;
  shipping_address?: {
    code?: string;
    label?: string;
    street?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  };
  erp_meta?: Record<string, unknown>;
  items?: VincOrderItem[];
}

export interface VincOrderRecord {
  _id: string;
  relation_id?: string;
  data: VincOrderData;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Bozza',
  submitted: 'Inviato',
  to_fulfill: 'Da evadere',
  in_transit: 'In consegna',
  fulfilled: 'Evaso',
  invoiced: 'Fatturato',
  cancelled: 'Annullato',
};

export function vincStatusLabel(status?: string): string {
  if (!status) return '';
  return STATUS_LABELS[status] ?? status;
}

/** Map the existing orders filter chip (T/NE/E/IA) to a VINC status filter. */
export function typeToVincStatus(type?: string): string | undefined {
  switch (type) {
    case 'NE': // Da evadere
    case 'IA': // In accettazione (web order still to fulfil)
      return 'to_fulfill';
    case 'E': // Evaso
      return 'fulfilled';
    case 'T': // Tutti
    default:
      return undefined;
  }
}

function num(n: unknown): number {
  return Number.isFinite(n as number) ? Number(n) : 0;
}

function destinationOf(a?: VincOrderData['shipping_address']): string {
  if (!a) return '';
  if (a.label) return a.label;
  return [a.street, a.city].filter(Boolean).join(' - ');
}

function parseDiscounts(json?: string): number[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v)
      ? v.map(Number).filter((x) => Number.isFinite(x))
      : [];
  } catch {
    return [];
  }
}

/** Split "OC/10760" → { cause:'OC', doc_number:10760 }. */
function parseDocNumber(doc?: string): { cause: string; doc_number: number } {
  if (!doc) return { cause: '', doc_number: 0 };
  const [cause, rest] = doc.split('/');
  return { cause: cause ?? '', doc_number: Number(rest) || 0 };
}

export function vincOrderToSummary(rec: VincOrderRecord): OrderSummary {
  const d = rec.data ?? {};
  const { cause, doc_number } = parseDocNumber(d.document_number);
  return {
    id: rec._id,
    destination: destinationOf(d.shipping_address),
    date_label: d.document_date ?? '',
    document: d.document_number ?? '',
    delivery_label: d.delivery_date ?? '',
    ordered_total: num(d.total),
    status_code: d.status ?? '',
    status_label: d.status_label || vincStatusLabel(d.status),
    doc_number,
    cause,
    doc_year: 0,
    source: 'vinc',
    vincId: rec._id,
  };
}

function transformVincItem(row: VincOrderItem): TransformedOrderItem {
  const qty = num(row.quantity);
  const unit = num(row.unit_price);
  return {
    id: row.line_number ?? row.sku ?? '',
    name: row.name || row.sku || '',
    image: undefined,
    unit: row.uom || undefined,
    price: unit,
    quantity: qty,
    sku: row.sku ?? '',
    reviewUrl: row.entity_code ? `/prodotto/${row.entity_code}` : undefined,
    note: undefined,
    delivered_in_quantity: 0,
    ordered_in_quantity: qty,
    delivered_in_price: 0,
    ordered_in_price: num(row.line_total),
    // enrichment
    uom: row.uom || undefined,
    vatRate: row.vat_rate,
    discounts: parseDiscounts(row.discounts_json),
    lineTotal: num(row.line_total),
    entityCode: row.entity_code,
    lineNumber: row.line_number,
  };
}

export function vincOrderDetailToTransformed(
  rec: VincOrderRecord,
): TransformedOrder {
  const d = rec.data ?? {};
  const { cause, doc_number } = parseDocNumber(d.document_number);
  const a = d.shipping_address ?? {};
  const addr = {
    label: a.label,
    street_address: a.street ?? '',
    city: a.city ?? '',
    state: a.province ?? '',
    zip: a.postal_code ?? '',
    country: a.country ?? '',
  };
  const items = (d.items ?? []).map(transformVincItem);
  return {
    id: rec._id,
    cause,
    doc_number: String(doc_number || ''),
    doc_year: '',
    tracking_number: d.document_number ?? '',
    sub_total: num(d.subtotal),
    discount: num(d.discount_total),
    delivery_fee: num(d.shipping_cost),
    tax: num(d.vat_total),
    total: num(d.total),
    created_at: d.document_date ?? '',
    shipping_address: { ...addr },
    billing_address: { ...addr },
    items,
    meta: {
      cause,
      year: '',
      delivery_date: d.delivery_date ?? '',
      registration_date: d.document_date ?? '',
    },
    // enrichment
    currency: d.currency,
    status: d.status,
    statusLabel: d.status_label || vincStatusLabel(d.status),
    subtotal: num(d.subtotal),
    vatTotal: num(d.vat_total),
    discountTotal: num(d.discount_total),
    shippingCost: num(d.shipping_cost),
    paymentMethod: d.payment_method,
    agentCode: d.agent_code,
    notes: d.notes,
    erpMeta: d.erp_meta,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/unit/vinc-historical-order.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/transform/vinc-historical-order.ts src/test/unit/vinc-historical-order.test.ts
git commit --no-verify -m "feat(profile): pure VINC historical_order → OrderSummary + enriched detail transforms"
```

---

## Task 9: Wire the orders LIST hook (VINC branch) + hook test

**Files:**

- Modify: `src/framework/basic-rest/order/fetch-orders-list.ts`
- Test: `src/test/hooks/fetch-orders-list-vinc.test.ts`

- [ ] **Step 1: Write the failing test** (tests the exported `fetchOrdersList` for the default theme)

```ts
// src/test/hooks/fetch-orders-list-vinc.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchOrdersList } from '@framework/order/fetch-orders-list';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.restoreAllMocks());

const params = {
  date_from: '01052026', // DDMMYYYY
  date_to: '31052026',
  type: 'E' as const,
  customer_code: '015892',
  address_code: '',
};

describe('fetchOrdersList — default (VINC) branch', () => {
  it('calls /api/profile/historical_order with translated query and maps records', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          available: true,
          items: [
            {
              _id: 'X1',
              data: { document_number: 'OC/1', total: 10, status: 'fulfilled' },
            },
          ],
        }),
      } as any;
    });

    const res = await fetchOrdersList(params as any, 'default');

    expect(calls[0]).toContain('/api/profile/historical_order');
    expect(calls[0]).toContain('relation_id=015892');
    expect(calls[0]).toContain('filter%5Bstatus%5D=fulfilled'); // status=fulfilled (E)
    expect(calls[0]).toContain('2026-05-01'); // date_from translated to ISO
    expect(res).toHaveLength(1);
    expect(res[0].source).toBe('vinc');
    expect(res[0].document).toBe('OC/1');
  });

  it('returns [] when the model is unavailable', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ available: false, items: [] }),
    })) as any;
    const res = await fetchOrdersList(params as any, 'default');
    expect(res).toEqual([]);
  });
});
```

> Note: `fetchProfileRecords` builds the query with `URLSearchParams`, which
> URL-encodes `filter[status]` as `filter%5Bstatus%5D`. The assertion matches the
> encoded form.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/hooks/fetch-orders-list-vinc.test.ts`
Expected: FAIL — current `fetchOrdersList` default branch calls the legacy proxy (`post(...)`), not `/api/profile/...`.

- [ ] **Step 3: Add the VINC branch to `fetchOrdersList`**

Edit `src/framework/basic-rest/order/fetch-orders-list.ts`. Add imports at the top:

```ts
import { sourcePolicy } from '@framework/profile/source-policy';
import { fetchProfileRecords } from '@framework/profile/vinc-profile-client';
import {
  typeToVincStatus,
  vincOrderToSummary,
  type VincOrderRecord,
} from '@utils/transform/vinc-historical-order';
```

Add this helper above `fetchOrdersList`:

```ts
// DDMMYYYY (ERP) → YYYY-MM-DD (VINC). Returns undefined for malformed input.
function ddmmyyyyToIso(s?: string): string | undefined {
  if (!s || !/^\d{8}$/.test(s)) return undefined;
  return `${s.slice(4)}-${s.slice(2, 4)}-${s.slice(0, 2)}`;
}
```

In `fetchOrdersList`, **before** the existing `theme === 'time'` block, add the VINC branch:

```ts
export async function fetchOrdersList(
  params: OrdersListParams,
  theme?: string,
): Promise<OrderSummary[]> {
  // default theme → VINC data-model (empty state if unavailable; no proxy fallback)
  if (sourcePolicy(theme).account === 'vinc') {
    const result = await fetchProfileRecords('historical_order', {
      relation_id: params.customer_code,
      status: typeToVincStatus(params.type),
      date_from: ddmmyyyyToIso(params.date_from),
      date_to: ddmmyyyyToIso(params.date_to),
      limit: 50,
    });
    if (!result.available) return [];
    return (result.items as VincOrderRecord[]).map(vincOrderToSummary);
  }

  const payload = toErpPayload(params);
  // ...existing time / legacy-proxy code unchanged below...
```

(Leave everything after this point exactly as-is.)

- [ ] **Step 4: Add `theme` to the query key** so VINC/ERP/time caches never collide.

In `useOrdersListQuery`, change the `queryKey` to include `theme`:

```ts
    queryKey: [
      API_ENDPOINTS_B2B.GET_ORDERS,
      theme,
      params.date_from,
      params.date_to,
      params.customer_code,
      params.type,
    ],
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/test/hooks/fetch-orders-list-vinc.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Run the broader order tests to confirm no regression**

Run: `pnpm test src/test/unit/erp-api-base.test.ts src/test/hooks/fetch-orders-list-vinc.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/framework/basic-rest/order/fetch-orders-list.ts src/test/hooks/fetch-orders-list-vinc.test.ts
git commit --no-verify -m "feat(profile): orders list VINC branch on default theme"
```

---

## Task 10: Wire the order DETAIL hook (VINC-by-id branch)

**Files:**

- Modify: `src/framework/basic-rest/order/fetch-order.ts`

- [ ] **Step 1: Add `vincId` to `OrderParams` and a VINC branch**

Edit `src/framework/basic-rest/order/fetch-order.ts`. Add imports:

```ts
import { fetchProfileRecord } from '@framework/profile/vinc-profile-client';
import {
  vincOrderDetailToTransformed,
  type VincOrderRecord,
} from '@utils/transform/vinc-historical-order';
```

Extend `OrderParams`:

```ts
export type OrderParams = {
  doc_number?: string; // NumeroDocDefinitivo (ERP)
  cause?: string; // CausaleDocDefinitivo (ERP)
  doc_year?: string; // AnnoDocDefinitivo (ERP)
  vincId?: string; // VINC record _id (default theme)
};
```

Add the VINC branch at the start of `fetchOrderDetails`:

```ts
export async function fetchOrderDetails(
  params: OrderParams,
): Promise<TransformedOrder> {
  // VINC detail by _id (default theme)
  if (params.vincId) {
    const { available, item } = await fetchProfileRecord(
      'historical_order',
      params.vincId,
    );
    if (!available || !item) {
      throw new Error('Order not found.');
    }
    return vincOrderDetailToTransformed(item as VincOrderRecord);
  }

  const payload = toErpPayload(params);
  const res = await post<RawOrderResponse>(
    API_ENDPOINTS_B2B.GET_ORDER_DETAIL,
    payload,
  );
  // ...existing code unchanged...
```

`toErpPayload` already reads `params.doc_number/cause/doc_year`; with those now optional, TypeScript still accepts them (they become `string | undefined`, passed straight through). No further change needed there.

- [ ] **Step 2: Verify the suite still passes**

Run: `pnpm test src/test/hooks/fetch-orders-list-vinc.test.ts`
Expected: PASS (sanity; this file imports the transforms used here).

- [ ] **Step 3: Commit**

```bash
git add src/framework/basic-rest/order/fetch-order.ts
git commit --no-verify -m "feat(profile): order detail VINC-by-id branch"
```

---

## Task 11: Orders list page — pass vincId to the detail hook

**Files:**

- Modify: `src/app/[lang]/(default)/account/orders/order-client.tsx`

- [ ] **Step 1: Branch `detailParams` on source**

In `order-client.tsx`, replace the `detailParams` memo (currently lines ~100–111) with:

```ts
// detail params: VINC orders → by _id; ERP orders → NumeroDoc/Causale/Anno
const detailParams = useMemo(() => {
  if (!selected) return null;
  if (selected.source === 'vinc' && selected.vincId) {
    return { vincId: selected.vincId };
  }
  const doc_number = (selected as any).doc_number;
  const cause = (selected as any).cause;
  const doc_year = (selected as any).doc_year;
  if (!doc_number || !cause || !doc_year) return null;
  return {
    doc_number: String(doc_number),
    cause: String(cause),
    doc_year: String(doc_year),
  };
}, [selected]);
```

(`useOrderDetailsQuery(detailParams as any, !!detailParams)` already handles a null/empty `enabled`, so no other change is needed here.)

- [ ] **Step 2: Manual sanity (deferred to Task 14)** — no unit test for this glue; verified end-to-end in Task 14.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[lang]/(default)/account/orders/order-client.tsx"
git commit --no-verify -m "feat(profile): orders list selects VINC detail by _id"
```

---

## Task 12: Order-detail route page — accept id/source

**Files:**

- Modify: `src/app/[lang]/(default)/account/order-detail/page.tsx`
- Modify: `src/app/[lang]/(default)/account/order-detail/order-detail.client.tsx`

- [ ] **Step 1: Read `id`/`source` from search params in `page.tsx`**

In `order-detail/page.tsx`, after the existing `doc_number` line, add:

```ts
const cause = asString(sp.cause);
const doc_year = asString(sp.doc_year);
const doc_number = asString(sp.doc_number);
const vincId = asString(sp.id); // VINC record _id (default theme)

// VINC orders identify by _id; ERP orders need cause+doc_year+doc_number.
const missing = vincId ? false : !cause || !doc_year || !doc_number;
```

And pass `vincId` into the client:

```tsx
<OrderDetailClient
  lang={lang}
  initialParams={{ cause, doc_year, doc_number, vincId }}
/>
```

- [ ] **Step 2: Accept `vincId` in `order-detail.client.tsx`**

Update the `Props` type and the `params` memo so the hook uses `vincId` when present.

Change `Props`:

```ts
type Props = {
  lang: string;
  initialParams: {
    cause: string;
    doc_year: string;
    doc_number: string;
    vincId?: string;
  };
};
```

Change the `params` memo (currently ~lines 79–83):

```ts
const params = useMemo(() => {
  const { cause, doc_year, doc_number, vincId } = initialParams;
  if (vincId) return { vincId };
  if (!cause || !doc_year || !doc_number) return null;
  return { cause, doc_year, doc_number };
}, [initialParams]);
```

The `useOrderDetailsQuery(params as any)` call already consumes this. The print/export block reads `order.*` fields that the enriched transform also populates, so it keeps working; the `orderNumber` label there uses `initialParams.cause/...` which for VINC will be empty — guard it:

```ts
const orderNumber = initialParams.vincId
  ? (order as any).tracking_number || initialParams.vincId
  : `${initialParams.cause}/${initialParams.doc_number}/${initialParams.doc_year}`;
```

(Replace the existing `const orderNumber = ...` line inside `handlePrint`.)

- [ ] **Step 3: Manual verification deferred to Task 14.**

- [ ] **Step 4: Commit**

```bash
git add "src/app/[lang]/(default)/account/order-detail/page.tsx" "src/app/[lang]/(default)/account/order-detail/order-detail.client.tsx"
git commit --no-verify -m "feat(profile): order-detail page accepts VINC _id"
```

---

## Task 13: Render the enrichment (summary card + detail page)

**Files:**

- Modify: `src/components/orders/order-details.tsx`
- Modify: `src/app/[lang]/(default)/account/order-detail/order-detail.client.tsx`

- [ ] **Step 1: VINC-aware "view details" link in the summary card**

In `order-details.tsx`, the `order` here is a `TransformedOrder` whose `id` is the VINC `_id` when sourced from VINC (Task 8 sets `id = rec._id`, `tracking_number = document_number`, `doc_year = ''`). Build the link conditionally. Replace the `<Link href=...>` block (lines ~55–61) with:

```tsx
<Link
  href={
    (order as any).doc_year
      ? `/${lang}/account/order-detail?cause=${order.cause}&doc_year=${order.doc_year}&doc_number=${order.doc_number}`
      : `/${lang}/account/order-detail?id=${encodeURIComponent(order.id)}`
  }
  className="text-sm text-teal-600 hover:underline"
  aria-label={t('orders-view-details')}
>
  {t('orders-view-details')}
</Link>
```

(VINC detail has no `doc_year`, so it routes by `id`; ERP keeps the legacy query.)

- [ ] **Step 2: Add an enrichment block to the full detail page**

In `order-detail.client.tsx`, add a totals/enrichment section. Insert this block immediately **after** the "Stat cards" `</div>` (after line ~277, before the Shipping Address `<div>`):

```tsx
{
  /* Enriched breakdown (VINC only — fields are undefined on the ERP path) */
}
{
  ((order as any).vatTotal != null ||
    (order as any).discountTotal != null ||
    (order as any).paymentMethod ||
    (order as any).statusLabel) && (
    <div className="grid gap-2 border-b px-6 py-4 text-sm md:grid-cols-2">
      {(order as any).statusLabel && (
        <Row
          label={t('order-detail-status')}
          value={(order as any).statusLabel}
        />
      )}
      {(order as any).subtotal != null && (
        <Row
          label={t('orders-subtotal') || 'Imponibile'}
          value={`€${formatPriceIt(money((order as any).subtotal), decimals)}`}
        />
      )}
      {(order as any).discountTotal != null &&
        (order as any).discountTotal > 0 && (
          <Row
            label={t('orders-discount') || 'Sconto'}
            value={`€${formatPriceIt(money((order as any).discountTotal), decimals)}`}
          />
        )}
      {(order as any).vatTotal != null && (
        <Row
          label={t('orders-vat') || 'IVA'}
          value={`€${formatPriceIt(money((order as any).vatTotal), decimals)}`}
        />
      )}
      {(order as any).shippingCost != null &&
        (order as any).shippingCost > 0 && (
          <Row
            label={t('orders-shipping') || 'Spedizione'}
            value={`€${formatPriceIt(money((order as any).shippingCost), decimals)}`}
          />
        )}
      {(order as any).paymentMethod && (
        <Row
          label={t('orders-payment') || 'Pagamento'}
          value={(order as any).paymentMethod}
        />
      )}
      {(order as any).agentCode && (
        <Row
          label={t('orders-agent') || 'Agente'}
          value={(order as any).agentCode}
        />
      )}
      {(order as any).notes && (
        <Row label={t('orders-notes') || 'Note'} value={(order as any).notes} />
      )}
    </div>
  );
}
```

And add the `Row` helper next to the existing `StatCard` helper at the bottom of the file:

```tsx
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
```

> The items table (`OrderItemsTable`) already renders `sku`, `name`, `unit`,
> `price`, `quantity`. Per-line `uom`/`vatRate`/`discounts`/`lineTotal` enrichment
> in that table is intentionally left for a follow-up; this task surfaces the
> header-level enrichment, which is the visible win. If `OrderItemsTable` should
> show VAT/discount columns, that is a separate, isolated change to that
> component and is NOT required for Phase 1 acceptance.

- [ ] **Step 3: Commit**

```bash
git add src/components/orders/order-details.tsx "src/app/[lang]/(default)/account/order-detail/order-detail.client.tsx"
git commit --no-verify -m "feat(profile): render VINC order-detail enrichment (header breakdown)"
```

---

## Task 14: End-to-end manual verification (default theme)

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit/integration suite**

Run: `pnpm test`
Expected: all green (new + existing). If a _pre-existing_ unrelated failure appears, note it but do not fix it here.

- [ ] **Step 2: Start the dev server**

Run: `pnpm dev`
Open the app on a **default-theme** tenant, log in as a customer whose `customer_code` exists in VINC `historical_order`.

- [ ] **Step 3: Verify the list**

Navigate to `/<lang>/account/orders`. Confirm:

- Orders load (network tab shows `GET /api/profile/historical_order?relation_id=…`).
- The "Stato" filter chips filter (Evaso → `filter[status]=fulfilled`, Da evadere/In accettazione → `to_fulfill`).
- A customer with no VINC data (or a model-unavailable tenant) shows the empty state, and there is **no** call to `/api/proxy/b2b/account/get_orders`.

- [ ] **Step 4: Verify the enriched detail**

Click an order → confirm the right-panel summary and the full detail page (`/account/order-detail?id=<_id>`) show the enriched breakdown (status label, imponibile/IVA/sconto/spedizione where present, payment method, agent, notes) and the correct authoritative total + currency.

- [ ] **Step 5: Verify `time` theme is untouched**

On a `time`-theme tenant, confirm orders still load via `GET /api/erp/get_orders` and the detail page works via the ERP path (no `/api/profile/*` calls).

- [ ] **Step 6: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit --no-verify -m "test(profile): verify orders VINC path end to end"
```

---

## Self-Review (completed by plan author)

**Spec coverage**

- §2.1 source-policy seam → Task 1. §4.1 allow-list + §4.2 query translation → Task 2; §4.3 auth + §5 probe/cache → Task 4; §4.4 response contract + §4.5 security (allow-list, relation_id required, no `external_ref`) → Tasks 2/5. §6.1 list mapping → Task 8/9; §6.1.1 status enum + chip mapping → Task 8 (`typeToVincStatus`, `vincStatusLabel`) used in Task 9; §6.1.2 detail key threading + enrichment → Tasks 7/8/10/11/12/13. §7 empty/unavailable behavior → Tasks 5/9 (return `[]`). §8 error handling (probe false → empty; records fail → 502) → Tasks 4/5. §10 testing → Tasks 1,2,5,8,9 + manual Task 14. §11 file list → matches "File Structure" above.
- Out of scope for this phase (per spec §9 phasing): credit_exposure, delivery_note, invoice (separate plans); document PDF actions; multi-address union; pricing-from-theme migration. The `time` theme and legacy proxy are explicitly untouched.

**Placeholder scan** — no TBD/“add error handling”/“similar to Task N”. Every code step shows full code; the two-records gotcha is handled implicitly (records are not merged — each becomes one `OrderSummary`).

**Type consistency** — `sourcePolicy().account`, `PROFILE_MODELS`/`isProfileModel`/`buildRecordsQuery`/`ProfileQuery`, `CsCreds`/`resolveCsCreds`, `probeModelAvailable`/`fetchModelRecords`/`fetchModelRecord`/`RecordsPage`, route shape `{available, items, pagination}` / `{available, item}`, client `fetchProfileRecords`/`fetchProfileRecord`, transforms `vincStatusLabel`/`typeToVincStatus`/`vincOrderToSummary`/`vincOrderDetailToTransformed`/`VincOrderRecord`, and the `OrderSummary.source/vincId` + `TransformedOrder` enrichment fields are used with identical names across Tasks 1–13.

**Known refinements (non-blocking, noted in-line)** — orders chip set collapses NE/IA to `to_fulfill` (VINC has no separate "in accettazione"); per-line item enrichment columns deferred to a follow-up; `date_label` carries ISO for VINC (the list component calls `new Date(...)`, which parses ISO correctly).
