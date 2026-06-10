# VINC Profile — Customer (anagrafica) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the `default` theme, source the customer anagrafica (`useCustomerQuery`/`fetchCustomer`) from the VINC Commerce-Suite customer endpoint instead of the legacy B2B proxy `get_customer`, eliminating that legacy call with full field parity. `time`/other themes untouched.

**Architecture:** Reuses the built foundation (`resolveCsCreds` for per-tenant CS api-key creds). Adds a pure transform `csCustomerToProfile` (CS customer → existing `CustomerProfile`), a thin BFF route `POST /api/b2b/customer` (resolve creds → `GET ${csBaseUrl}/api/b2b/customers/{id}` → map), and a VINC branch in `fetchCustomer` that calls it with `ERP_STATIC.vinc_customer_id` (mirrors the existing `fetchAddresses` → `/api/b2b/addresses` pattern).

**Tech Stack:** Next.js 16, React Query, TypeScript, Vitest.

**Confirmed source (Commerce Suite `vinc-commerce-suite`):**

- `GET /api/b2b/customers/{id}` (api-key authed; looks up by `customer_id` then `external_code`) → `{ success, customer }`.
- Customer fields: `public_code`, `external_code`, `company_name`, `first_name`, `last_name`, `email`, `customer_type` (`business|private|reseller`), `legal_info { vat_number, fiscal_code, pec_email, sdi_code }`.
- Target `CustomerProfile` (`src/framework/basic-rest/acccount/types-b2b-account.ts`) fields the Fido/profile page uses: `code, businessName, firstName, lastName, taxCode, vatNumber, pec, sdi, isLegalEntity`.

**Mapping:** `code←public_code||external_code`, `businessName←company_name`, `firstName←first_name`, `lastName←last_name`, `taxCode←legal_info.fiscal_code`, `vatNumber←legal_info.vat_number`, `pec←legal_info.pec_email`, `sdi←legal_info.sdi_code`, `isLegalEntity←customer_type!=='private'`.

**Conventions:** run one test file with `pnpm test <path>`; aliases `@framework/` → `src/framework/basic-rest/`, `@utils/` → `src/utils/`, `@/` → `src/`; commits have **no** `Co-Authored-By`/`Generated with` lines; `--no-verify` if pre-existing lint blocks; never run `pnpm build`. Working tree has unrelated in-progress files — always `git add` exact paths, never `git add -A`.

---

## File Structure

**New**

- `src/utils/transform/cs-customer.ts` — pure `csCustomerToProfile` + `CsCustomerRecord` type.
- `src/app/api/b2b/customer/route.ts` — BFF `POST` route → CS customer → `CustomerProfile`.
- `src/test/unit/cs-customer.test.ts` — transform tests.
- `src/test/api/customer-route.test.ts` — route tests.
- `src/test/hooks/fetch-customer-vinc.test.ts` — `fetchCustomer` VINC-branch tests.

**Modified**

- `src/framework/basic-rest/acccount/fetch-account.ts` — VINC branch in `fetchCustomer`; add `theme` to the `useCustomerQuery` query key.

---

## Task 1: CS customer → CustomerProfile transform (pure)

**Files:**

- Create: `src/utils/transform/cs-customer.ts`
- Test: `src/test/unit/cs-customer.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/test/unit/cs-customer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { csCustomerToProfile } from '@/utils/transform/cs-customer';

describe('csCustomerToProfile', () => {
  it('maps a CS customer (with legal_info) to CustomerProfile', () => {
    const p = csCustomerToProfile({
      public_code: '007959',
      external_code: '007959',
      company_name: "D'AMBRA VINCENZO",
      first_name: 'Vincenzo',
      last_name: "D'Ambra",
      customer_type: 'business',
      legal_info: {
        vat_number: 'IT01234567890',
        fiscal_code: 'DMBVCN...',
        pec_email: 'pec@example.it',
        sdi_code: 'ABCDEFG',
      },
    });
    expect(p.code).toBe('007959');
    expect(p.businessName).toBe("D'AMBRA VINCENZO");
    expect(p.firstName).toBe('Vincenzo');
    expect(p.lastName).toBe("D'Ambra");
    expect(p.taxCode).toBe('DMBVCN...');
    expect(p.vatNumber).toBe('IT01234567890');
    expect(p.pec).toBe('pec@example.it');
    expect(p.sdi).toBe('ABCDEFG');
    expect(p.isLegalEntity).toBe(true);
  });

  it('falls back to external_code and handles missing legal_info / private type', () => {
    const p = csCustomerToProfile({
      external_code: '009999',
      customer_type: 'private',
    });
    expect(p.code).toBe('009999');
    expect(p.vatNumber).toBeUndefined();
    expect(p.pec).toBeUndefined();
    expect(p.sdi).toBeUndefined();
    expect(p.isLegalEntity).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/cs-customer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation** — create `src/utils/transform/cs-customer.ts`:

```ts
import type { CustomerProfile } from '@framework/acccount/types-b2b-account';

export interface CsCustomerRecord {
  public_code?: string;
  external_code?: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  customer_type?: 'business' | 'private' | 'reseller' | string;
  legal_info?: {
    vat_number?: string;
    fiscal_code?: string;
    pec_email?: string;
    sdi_code?: string;
  };
}

/** Map a Commerce-Suite customer record to the existing CustomerProfile shape. */
export function csCustomerToProfile(c: CsCustomerRecord): CustomerProfile {
  const legal = c.legal_info ?? {};
  return {
    code: c.public_code || c.external_code || '',
    businessName: c.company_name || undefined,
    firstName: c.first_name || undefined,
    lastName: c.last_name || undefined,
    taxCode: legal.fiscal_code || undefined,
    vatNumber: legal.vat_number || undefined,
    pec: legal.pec_email || undefined,
    sdi: legal.sdi_code || undefined,
    isLegalEntity: c.customer_type !== 'private',
  };
}
```

> Note: `CustomerProfile` has only `code` and `isLegalEntity` as required fields; every other field is optional. If type-checking reports a required field this object omits, STOP and report it (do not invent values).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/unit/cs-customer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/transform/cs-customer.ts src/test/unit/cs-customer.test.ts
git commit --no-verify -m "feat(profile): pure CS customer -> CustomerProfile transform"
```

---

## Task 2: BFF route — POST /api/b2b/customer

**Files:**

- Create: `src/app/api/b2b/customer/route.ts`
- Test: `src/test/api/customer-route.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/test/api/customer-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/profile/cs-creds', () => ({
  resolveCsCreds: vi.fn(async () => ({
    csBaseUrl: 'https://cs.example',
    apiKeyId: 'k',
    apiSecret: 's',
  })),
}));

import { POST } from '@/app/api/b2b/customer/route';
import { NextRequest } from 'next/server';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});

function req(body: unknown) {
  return new NextRequest('http://localhost/api/b2b/customer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

import { afterEach } from 'vitest';

describe('POST /api/b2b/customer', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('400s when customer_id is missing', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it('fetches the CS customer and returns a mapped CustomerProfile', async () => {
    let calledUrl = '';
    let headers: any;
    global.fetch = vi.fn(async (url: any, init: any) => {
      calledUrl = String(url);
      headers = init?.headers;
      return {
        ok: true,
        json: async () => ({
          success: true,
          customer: {
            public_code: '007959',
            company_name: 'ACME',
            customer_type: 'business',
            legal_info: {
              vat_number: 'IT1',
              pec_email: 'p@e.it',
              sdi_code: 'SDI123',
            },
          },
        }),
      } as any;
    }) as any;

    const res = await POST(req({ customer_id: 'cust_X' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(calledUrl).toBe('https://cs.example/api/b2b/customers/cust_X');
    expect(headers['x-api-key-id']).toBe('k');
    expect(json.success).toBe(true);
    expect(json.customer.code).toBe('007959');
    expect(json.customer.vatNumber).toBe('IT1');
    expect(json.customer.sdi).toBe('SDI123');
  });

  it('502s when the upstream call fails', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500 })) as any;
    const res = await POST(req({ customer_id: 'cust_X' }));
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/api/customer-route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Write the route** — create `src/app/api/b2b/customer/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import {
  csCustomerToProfile,
  type CsCustomerRecord,
} from '@utils/transform/cs-customer';

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const customerId = body?.customer_id;
  if (!customerId) {
    return NextResponse.json(
      { success: false, message: 'customer_id is required' },
      { status: 400 },
    );
  }

  const creds = await resolveCsCreds(req);

  try {
    const res = await fetch(
      `${creds.csBaseUrl.replace(/\/+$/, '')}/api/b2b/customers/${encodeURIComponent(customerId)}`,
      {
        headers: {
          Accept: 'application/json',
          'x-auth-method': 'api-key',
          'x-api-key-id': creds.apiKeyId,
          'x-api-secret': creds.apiSecret,
        },
      },
    );
    if (!res.ok) {
      console.error(`[b2b/customer] CS customers HTTP ${res.status}`);
      return NextResponse.json(
        { success: false, message: `CS customer HTTP ${res.status}` },
        { status: 502 },
      );
    }
    const json: any = await res.json();
    const customer = json?.customer ?? json?.data;
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      customer: csCustomerToProfile(customer as CsCustomerRecord),
    });
  } catch (error) {
    console.error('[b2b/customer] failed:', error);
    return NextResponse.json(
      { success: false, message: 'customer fetch failed' },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/api/customer-route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/b2b/customer/route.ts src/test/api/customer-route.test.ts
git commit --no-verify -m "feat(profile): BFF /api/b2b/customer route (CS customer -> CustomerProfile)"
```

---

## Task 3: Wire fetchCustomer (VINC branch)

**Files:**

- Modify: `src/framework/basic-rest/acccount/fetch-account.ts`
- Test: `src/test/hooks/fetch-customer-vinc.test.ts`

READ `src/framework/basic-rest/acccount/fetch-account.ts` first. `fetchCustomer(theme)` currently does `theme==='time'` → `erpPost('/erp/get_customer', …)`, else `post(GET_CUSTOMER, …)`, then unwraps + `transformCustomer`. `fetchAddresses` (same file) already shows the VINC pattern: read `ERP_STATIC.vinc_customer_id`, `fetch('/api/b2b/addresses', { method:'POST', body: JSON.stringify({ customer_id }) })`, use `data.success`. `useCustomerQuery` uses `useThemeId()` and `queryKey: [API_ENDPOINTS_B2B.GET_CUSTOMER]`.

- [ ] **Step 1: Write the failing test** — create `src/test/hooks/fetch-customer-vinc.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: {
    customer_code: '007959',
    vinc_customer_id: 'cust_X',
    address_code: '',
    id_cart: '0',
  },
}));

import { fetchCustomer } from '@framework/acccount/fetch-account';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => vi.clearAllMocks());

describe('fetchCustomer — default (VINC) branch', () => {
  it('POSTs vinc_customer_id to /api/b2b/customer and returns the profile', async () => {
    const calls: string[] = [];
    let sentBody: any;
    global.fetch = vi.fn(async (url: any, init: any) => {
      calls.push(String(url));
      sentBody = JSON.parse(init?.body ?? '{}');
      return {
        ok: true,
        json: async () => ({
          success: true,
          customer: {
            code: '007959',
            businessName: 'ACME',
            vatNumber: 'IT1',
            isLegalEntity: true,
          },
        }),
      } as any;
    }) as any;

    const c = await fetchCustomer('default');
    expect(calls[0]).toContain('/api/b2b/customer');
    expect(sentBody.customer_id).toBe('cust_X');
    expect(c.code).toBe('007959');
    expect(c.vatNumber).toBe('IT1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/hooks/fetch-customer-vinc.test.ts`
Expected: FAIL — current default branch posts to the legacy proxy.

- [ ] **Step 3: Add imports** at the top of `src/framework/basic-rest/acccount/fetch-account.ts` (add to the existing profile imports if already present from earlier tasks — do not duplicate `sourcePolicy`):

```ts
import { sourcePolicy } from '@framework/profile/source-policy';
```

(`ERP_STATIC` and the `CustomerProfile` type are already imported in this file.)

- [ ] **Step 4: Add the VINC branch** as the FIRST statement inside `fetchCustomer`, before the existing `const raw = …`:

```ts
// default theme → VINC Commerce-Suite customer (via BFF); no legacy proxy call.
if (sourcePolicy(theme).account === 'vinc') {
  const vincId = ERP_STATIC.vinc_customer_id;
  if (!vincId) {
    // No VINC customer id yet — fall back to the minimal info from ERP_STATIC.
    return {
      code: ERP_STATIC.customer_code || '',
      businessName: ERP_STATIC.company_name || undefined,
      isLegalEntity: true,
    } as CustomerProfile;
  }
  const response = await fetch('/api/b2b/customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_id: vincId }),
  });
  const data = await response.json();
  if (data?.success && data?.customer) {
    return data.customer as CustomerProfile;
  }
  throw new Error(data?.message || 'Failed to fetch customer from VINC API');
}
```

Leave the existing `time` / legacy-proxy code after this point unchanged.

- [ ] **Step 5: Add `theme` to the query key** in `useCustomerQuery`. Change the existing `queryKey` to:

```ts
    queryKey: [API_ENDPOINTS_B2B.GET_CUSTOMER, theme],
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test src/test/hooks/fetch-customer-vinc.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/framework/basic-rest/acccount/fetch-account.ts src/test/hooks/fetch-customer-vinc.test.ts
git commit --no-verify -m "feat(profile): customer anagrafica VINC branch on default theme (no legacy get_customer)"
```

---

## Task 4: Verify

**Files:** none.

- [ ] **Step 1: Run the new suites + the account regressions**

Run: `pnpm test src/test/unit/cs-customer.test.ts src/test/api/customer-route.test.ts src/test/hooks/fetch-customer-vinc.test.ts src/test/hooks/fetch-exposition-vinc.test.ts`
Expected: PASS. (Pre-existing unrelated `forms-submit-route.test.ts` failures are not introduced here.)

- [ ] **Step 2: Observe in the running app** (needs `pnpm dev` + a logged-in default-theme customer)

Open `/<lang>/account/profile`. Confirm: network shows `POST /api/b2b/customer` (NOT `POST /api/proxy/b2b/account/get_customer`); the profile renders code / business name / first+last / codice fiscale / Partita IVA / PEC / SDI from VINC (values present where the CS record has them). Then open `/<lang>/account/deadlines` and confirm it no longer hits the legacy `get_customer` either.

- [ ] **Step 3: Confirm `time` theme unchanged** — on a time-theme tenant the profile still loads via `/api/erp/get_customer`; no `/api/b2b/customer` call.

---

## Self-Review (completed by plan author)

**Goal coverage:** default-theme `fetchCustomer` → VINC CS customer endpoint (Task 3) via a BFF route (Task 2) + pure mapper (Task 1); the legacy `get_customer` proxy call is removed on the default theme for every consumer of `useCustomerQuery` (profile + deadlines), with full field parity incl. VAT/PEC/SDI from `legal_info`. `time`/proxy branches untouched.

**Placeholder scan:** none — full code in every step; commands + expected results concrete.

**Type consistency:** `csCustomerToProfile(c): CustomerProfile`, `CsCustomerRecord`, and the BFF response `{ success, customer }` are used identically across Tasks 1–3. `CustomerProfile` field names match `src/framework/basic-rest/acccount/types-b2b-account.ts`. `resolveCsCreds` (api-key) is the same helper used by the profile routes. The `@framework/acccount/...` alias (single `basic-rest`) is used for the type import (note: `@framework` already maps to `src/framework/basic-rest`).

**Edge:** no `vinc_customer_id` → returns a minimal profile from `ERP_STATIC` (graceful, no legacy call). Upstream failure → 502 from the route → `fetchCustomer` throws → the profile page's existing error state.
