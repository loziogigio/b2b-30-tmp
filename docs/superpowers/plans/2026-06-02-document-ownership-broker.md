# Per-Owner Document Access Broker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Serve invoice/DDT PDFs only to the customer who owns them. The browser no longer gets the raw file URL; it requests a broker route on the b2b app, which validates the session, checks that the record's `relation_id` belongs to the logged-in user, and streams the file. Default theme (VINC) only.

**Architecture:** A new authenticated route `GET /api/profile/document/[model]/[id]?kind=pdf|barcode|csv` (in this repo). It (1) resolves the session's owned customer codes via SSO validate, (2) loads the VINC record (server-side api-key) to read its owning `relation_id` + the file URL, (3) 403s unless owned, (4) streams the upstream file. The document transforms emit this broker URL instead of the raw `pdf_url`, so the existing documents UI links to it unchanged.

**Tech Stack:** Next.js 16 route handlers (streaming via the upstream `Response.body`), TypeScript, Vitest.

**Verified facts:**

- `delivery_note`/`invoice` records carry `data.pdf_url` (real `https://b2b.hidros.com/documenti-clienti/…PDF`), `pdf_barcode_url`, `csv_url`; the record's top-level `relation_id` (e.g. `015892`) is the owner.
- `ssoApi.validate(accessToken)` → `SSOValidateResponse.user.customers: SSOCustomer[]`, each with `erp_customer_id` (`src/lib/sso-api/types.ts`). The session cookie is `AUTH_COOKIES.ACCESS_TOKEN` = `auth_token` (`src/lib/auth/cookies.ts`). The pattern to validate server-side is `src/app/api/auth/validate/route.ts` (`resolveAuthContext(req,'validate')` → `ssoApi.validate(token)`).
- Ownership = `record.relation_id ∈ Set(user.customers[].erp_customer_id)`.

**Conventions:** `pnpm test <path>`; aliases `@/`→`src/`, `@framework/`→`src/framework/basic-rest/`, `@utils/`→`src/utils/`; commits **no** `Co-Authored-By`/`Generated with`; `--no-verify` if lint blocks; never `pnpm build`; `git add` exact paths only.

**Infra dependency (out of this plan):** lock the Traefik `/documenti-clienti/` route to server-only (drop public / basic-auth) once this ships, so the file is reachable only by the broker. If the server can't fetch the public URL, set `DOCUMENTI_CLIENTI_INTERNAL_BASE` to an internal base and the broker rewrites the origin.

---

## File Structure

**New**

- `src/lib/profile/session-owner.ts` — `sessionOwnedCustomerCodes(req)` → `Set<string> | null`.
- `src/app/api/profile/document/[model]/[id]/route.ts` — the broker GET route.
- `src/test/api/document-broker-route.test.ts` — route tests.

**Modified**

- `src/utils/transform/vinc-document.ts` — emit broker URLs (gated on a real http file URL) instead of raw `pdf_url`/`pdf_barcode_url`/`csv_url`; add a `brokerDocUrl` helper.
- `src/test/unit/vinc-document.test.ts` — assert broker URLs.
- `src/test/hooks/fetch-documents-list-vinc.test.ts` — assert broker URLs.

(The default-theme `documents-client.tsx` already renders `row.pdf`/`barcodePdf`/`csv` as `<a>` links — no change needed; they now point at the broker.)

---

## Task 1: Session → owned customer codes (server)

**Files:**

- Create: `src/lib/profile/session-owner.ts`

- [ ] **Step 1: Implement** — create `src/lib/profile/session-owner.ts`:

```ts
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIES } from '@/lib/auth';
import { resolveAuthContext } from '@/lib/auth/server';

/**
 * The set of ERP customer codes (relation_ids) the current session owns,
 * derived from the SSO-validated token — NOT from any client-supplied value.
 * Returns null when there is no valid session (→ caller should 401).
 * Mirrors src/app/api/auth/validate/route.ts.
 */
export async function sessionOwnedCustomerCodes(
  req: NextRequest,
): Promise<Set<string> | null> {
  const token = (await cookies()).get(AUTH_COOKIES.ACCESS_TOKEN)?.value;
  if (!token) return null;

  const result = await resolveAuthContext(req, 'validate');
  if (!result.success) return null;

  try {
    const validation = await result.context.ssoApi.validate(token);
    const codes = (validation.user?.customers ?? [])
      .map((c) => c.erp_customer_id)
      .filter((c): c is string => typeof c === 'string' && c.length > 0);
    return new Set(codes);
  } catch {
    return null;
  }
}
```

> If `resolveAuthContext`'s result shape differs from `{ success, context: { ssoApi }, response }`, READ `src/lib/auth/tenant-resolver.ts` and adapt — but do not change behavior (token present + valid → Set; else null).

- [ ] **Step 2: Sanity build check** — `pnpm test src/test/unit/source-policy.test.ts` (expect PASS; confirms the workspace still compiles).

- [ ] **Step 3: Commit**

```bash
git add src/lib/profile/session-owner.ts
git commit --no-verify -m "feat(profile): server-side session→owned customer codes (SSO validate)"
```

---

## Task 2: The document broker route

**Files:**

- Create: `src/app/api/profile/document/[model]/[id]/route.ts`
- Test: `src/test/api/document-broker-route.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/test/api/document-broker-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sessionOwnedCustomerCodes = vi.fn();
const fetchModelRecord = vi.fn();

vi.mock('@/lib/profile/session-owner', () => ({ sessionOwnedCustomerCodes }));
vi.mock('@/lib/profile/cs-creds', () => ({
  resolveCsCreds: vi.fn(async () => ({
    csBaseUrl: 'https://cs',
    apiKeyId: 'k',
    apiSecret: 's',
  })),
}));
vi.mock('@/lib/profile/vinc-data-models', async (orig) => {
  const actual = await (orig as any)();
  return { ...actual, fetchModelRecord };
});

import { GET } from '@/app/api/profile/document/[model]/[id]/route';
import { NextRequest } from 'next/server';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});
beforeEach(() => {
  sessionOwnedCustomerCodes.mockReset();
  fetchModelRecord.mockReset();
});

function req(model: string, id: string, kind = 'pdf') {
  return new NextRequest(
    `http://localhost/api/profile/document/${model}/${id}?kind=${kind}`,
  );
}
const ctx = (model: string, id: string) => ({
  params: Promise.resolve({ model, id }),
});

describe('GET /api/profile/document/[model]/[id]', () => {
  it('404s an unknown model', async () => {
    const res = await GET(req('erp_settings', 'x'), ctx('erp_settings', 'x'));
    expect(res.status).toBe(404);
    expect(sessionOwnedCustomerCodes).not.toHaveBeenCalled();
  });

  it('401s when there is no valid session', async () => {
    sessionOwnedCustomerCodes.mockResolvedValue(null);
    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(401);
  });

  it('403s when the record is owned by another customer', async () => {
    sessionOwnedCustomerCodes.mockResolvedValue(new Set(['015892']));
    fetchModelRecord.mockResolvedValue({
      _id: 'i1',
      relation_id: '999999',
      data: { pdf_url: 'https://b2b/x.pdf' },
    });
    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(403);
  });

  it('404s when the owned record has no file for the kind', async () => {
    sessionOwnedCustomerCodes.mockResolvedValue(new Set(['015892']));
    fetchModelRecord.mockResolvedValue({
      _id: 'i1',
      relation_id: '015892',
      data: {},
    });
    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(404);
  });

  it('streams the file when the session owns the record', async () => {
    sessionOwnedCustomerCodes.mockResolvedValue(new Set(['015892']));
    fetchModelRecord.mockResolvedValue({
      _id: 'i1',
      relation_id: '015892',
      data: { pdf_url: 'https://b2b.hidros.com/documenti-clienti/F.pdf' },
    });
    let fetchedUrl = '';
    global.fetch = vi.fn(async (u: any) => {
      fetchedUrl = String(u);
      return {
        ok: true,
        body: new ReadableStream(),
        headers: new Headers({ 'content-type': 'application/pdf' }),
      } as any;
    }) as any;

    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('cache-control')).toContain('private');
    expect(fetchedUrl).toBe('https://b2b.hidros.com/documenti-clienti/F.pdf');
  });

  it('502s when the upstream file fetch fails', async () => {
    sessionOwnedCustomerCodes.mockResolvedValue(new Set(['015892']));
    fetchModelRecord.mockResolvedValue({
      _id: 'i1',
      relation_id: '015892',
      data: { pdf_url: 'https://b2b/x.pdf' },
    });
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      body: null,
    })) as any;
    const res = await GET(req('invoice', 'i1'), ctx('invoice', 'i1'));
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test src/test/api/document-broker-route.test.ts` (expect FAIL: route not found).

- [ ] **Step 3: Write the route** — create `src/app/api/profile/document/[model]/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import {
  isProfileModel,
  fetchModelRecord,
} from '@/lib/profile/vinc-data-models';
import { sessionOwnedCustomerCodes } from '@/lib/profile/session-owner';

type RouteParams = { params: Promise<{ model: string; id: string }> };

const FILE_FIELD: Record<string, string> = {
  pdf: 'pdf_url',
  barcode: 'pdf_barcode_url',
  csv: 'csv_url',
};

function isHttpUrl(u: unknown): u is string {
  return typeof u === 'string' && /^https?:\/\//i.test(u);
}

/**
 * Resolve the server-side fetch URL. The public /documenti-clienti route is
 * closed (403); fetch via the internal overlay (DOCUMENTI_CLIENTI_BASE, e.g.
 * http://vinc-tunnelgw:28000) which serves from the file ROOT — so the
 * /documenti-clienti prefix must be STRIPPED. Using URL.pathname normalizes
 * encoding (spaces → %20). Falls back to the original URL when no base is set.
 */
function resolveFetchUrl(u: string): string {
  const base = process.env.DOCUMENTI_CLIENTI_BASE;
  if (!base) return u;
  const { pathname } = new URL(u);
  const marker = '/documenti-clienti';
  const i = pathname.indexOf(marker);
  const rel = i >= 0 ? pathname.slice(i + marker.length) : pathname; // /D.D.T/2026/…PDF
  return `${base.replace(/\/+$/, '')}${rel}`;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { model, id } = await params;
  if (!isProfileModel(model)) {
    return NextResponse.json(
      { error: `Unknown model: ${model}` },
      { status: 404 },
    );
  }

  const field = FILE_FIELD[req.nextUrl.searchParams.get('kind') ?? 'pdf'];
  if (!field) {
    return NextResponse.json({ error: 'invalid kind' }, { status: 400 });
  }

  // 1) session → owned customer codes (server-derived; never trusts the client)
  const owned = await sessionOwnedCustomerCodes(req);
  if (!owned) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }

  // 2) load the record (server-side api-key)
  const creds = await resolveCsCreds(req);
  let rec: any;
  try {
    rec = await fetchModelRecord(creds, model, id);
  } catch (error) {
    console.error(
      `[document broker] ${model}/${id} record fetch failed:`,
      error,
    );
    return NextResponse.json({ error: 'record fetch failed' }, { status: 502 });
  }
  if (!rec) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // 3) ownership gate
  if (!rec.relation_id || !owned.has(String(rec.relation_id))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // 4) resolve + validate the file url
  const fileUrl = rec.data?.[field];
  if (!isHttpUrl(fileUrl)) {
    return NextResponse.json(
      { error: 'document not available' },
      { status: 404 },
    );
  }

  // 5) stream the file back (pass through type/length; propagate 404)
  try {
    const upstream = await fetch(resolveFetchUrl(fileUrl));
    if (upstream.status === 404) {
      return NextResponse.json(
        { error: 'document not found' },
        { status: 404 },
      );
    }
    if (!upstream.ok || !upstream.body) {
      console.error(
        `[document broker] upstream ${upstream.status} for ${model}/${id}`,
      );
      return NextResponse.json(
        { error: 'document unavailable' },
        { status: 502 },
      );
    }
    const filename = (fileUrl.split('/').pop() || `${model}-${id}`).split(
      '?',
    )[0];
    const headers: Record<string, string> = {
      'content-type':
        upstream.headers.get('content-type') ??
        (field === 'csv_url' ? 'text/csv' : 'application/pdf'),
      'content-disposition': `inline; filename="${decodeURIComponent(filename)}"`,
      'cache-control': 'private, no-store',
    };
    const len = upstream.headers.get('content-length');
    if (len) headers['content-length'] = len;
    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error(`[document broker] stream failed for ${model}/${id}:`, error);
    return NextResponse.json(
      { error: 'document unavailable' },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test src/test/api/document-broker-route.test.ts` (expect PASS, 6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/profile/document src/test/api/document-broker-route.test.ts
git commit --no-verify -m "feat(profile): per-owner document broker (validate session → ownership → stream PDF)"
```

---

## Task 3: Transforms emit broker URLs

**Files:**

- Modify: `src/utils/transform/vinc-document.ts`
- Test: `src/test/unit/vinc-document.test.ts`
- Test: `src/test/hooks/fetch-documents-list-vinc.test.ts`

- [ ] **Step 1: Add a broker-URL helper + a record `_id` field, and emit broker URLs.** In `src/utils/transform/vinc-document.ts`:

(a) add the helper (near `httpUrl`):

```ts
/** Same-origin broker link for a document; gated on the real file existing. */
function brokerDocUrl(
  model: 'delivery_note' | 'invoice',
  id: string,
  kind: 'pdf' | 'barcode' | 'csv',
  realFileUrl?: string,
): string | undefined {
  if (!httpUrl(realFileUrl) || !id) return undefined;
  return `/api/profile/document/${model}/${encodeURIComponent(id)}?kind=${kind}`;
}
```

(b) in `vincDeliveryNoteToRow`, replace the `pdf`/`barcodePdf` lines with:

```ts
    pdf: brokerDocUrl('delivery_note', rec._id, 'pdf', d.pdf_url),
    barcodePdf: brokerDocUrl('delivery_note', rec._id, 'barcode', d.pdf_barcode_url),
```

(c) in `vincInvoiceToRow`, replace the `pdf`/`barcodePdf`/`csv` lines with:

```ts
    pdf: brokerDocUrl('invoice', rec._id, 'pdf', d.pdf_url),
    barcodePdf: brokerDocUrl('invoice', rec._id, 'barcode', d.pdf_barcode_url),
    csv: brokerDocUrl('invoice', rec._id, 'csv', d.csv_url),
```

(`httpUrl` is still used inside `brokerDocUrl` — keep it. The legacy fallback (`BC/.../D`) → `httpUrl` undefined → no broker link → `—`, unchanged behavior.)

- [ ] **Step 2: Update the transform tests** — in `src/test/unit/vinc-document.test.ts`:

In the `vincDeliveryNoteToRow` "maps to a DDT DocumentRow" test, the record's `_id` is `'d1'` and `pdf_url`/`pdf_barcode_url` are https. Replace the URL assertions with broker URLs:

```ts
expect(r.pdf).toBe('/api/profile/document/delivery_note/d1?kind=pdf');
expect(r.barcodePdf).toBe(
  '/api/profile/document/delivery_note/d1?kind=barcode',
);
```

In the `vincInvoiceToRow` test (record `_id` `'i1'`), replace:

```ts
expect(r.pdf).toBe('/api/profile/document/invoice/i1?kind=pdf');
expect(r.barcodePdf).toBe('/api/profile/document/invoice/i1?kind=barcode');
expect(r.csv).toBe('/api/profile/document/invoice/i1?kind=csv');
```

(The "hides legacy non-http fallback strings" test still asserts `r.pdf`/`r.barcodePdf` are `undefined` — unchanged, since `brokerDocUrl` returns undefined for non-http inputs.)

- [ ] **Step 3: Update the documents hook test** — in `src/test/hooks/fetch-documents-list-vinc.test.ts`, the DDT record `_id` is `'d1'` and the invoice record `_id` is `'i1'`. Replace:

  - DDT test: `expect(rows[0].barcodePdf).toBe('https://cs/bc.pdf');` → `expect(rows[0].pdf).toBe('/api/profile/document/delivery_note/d1?kind=pdf');` (the DDT sample has `pdf_barcode_url` but the assertion can target whichever url the sample sets — set the sample's `data.pdf_url: 'https://cs/d.pdf'` and assert `rows[0].pdf` is the broker url). Adjust the DDT sample to include `pdf_url: 'https://cs/d.pdf'` and assert `rows[0].pdf === '/api/profile/document/delivery_note/d1?kind=pdf'`.
  - Invoice test: `expect(rows[0].csv).toBe('https://cs/x.csv');` → `expect(rows[0].csv).toBe('/api/profile/document/invoice/i1?kind=csv');`.
  - The `openDocument — VINC direct urls` describe block tests `openDocument` directly with a row carrying `csv: 'https://cs/x.csv'` — that's testing the (still-present) shared `openDocument` helper, not the transform, so leave it as-is.

- [ ] **Step 4: Run tests** — `pnpm test src/test/unit/vinc-document.test.ts src/test/hooks/fetch-documents-list-vinc.test.ts` (expect PASS).

- [ ] **Step 5: Commit**

```bash
git add src/utils/transform/vinc-document.ts src/test/unit/vinc-document.test.ts src/test/hooks/fetch-documents-list-vinc.test.ts
git commit --no-verify -m "feat(profile): documents link to the per-owner broker, not the raw file url"
```

---

## Task 4: Verify + security review

**Files:** none.

- [ ] **Step 1: Run the new + affected suites**

Run: `pnpm test src/test/api/document-broker-route.test.ts src/test/unit/vinc-document.test.ts src/test/hooks/fetch-documents-list-vinc.test.ts`
Expected: PASS. (Pre-existing unrelated `forms-submit-route.test.ts` failures are not introduced here.)

- [ ] **Step 2: Bounded type-check** of `session-owner.ts`, the broker route, and `vinc-document.ts` (temp tsconfig extending the project; ignore the known unrelated `get-pim-product.tsx` error). Expect no errors in these files.

- [ ] **Step 3: Live check** (needs `pnpm dev` + a logged-in default-theme customer):

  - Open `/<lang>/account/documents`, click a DDT/invoice **PDF** → opens via `/api/profile/document/<model>/<id>?kind=pdf` and streams the file.
  - With the **same** session, hit `/api/profile/document/invoice/<another-customer's-record-id>` → **403**.
  - Logged out (no `auth_token`) → **401**.

- [ ] **Step 4: Security review (read-only)** — confirm: ownership uses the SSO-validated `erp_customer_id` set (never a client-supplied value); the raw file URL is never returned to the client (only streamed); `cache-control: private, no-store`; allow-listed models only; no secrets in responses.

---

## Self-Review (plan author)

**Goal coverage:** server-derived owned codes (Task 1) → broker validates + ownership-gates + streams (Task 2) → UI links to the broker, never the raw url (Task 3). 401 (no session) / 403 (not owner) / 404 (no record or no file) / 502 (upstream) all covered by tests. Default-theme only (transforms run only in the VINC branch; the time theme's documents + the shared `openDocument` are untouched).

**Placeholder scan:** none — full code in every step; commands + expected results concrete.

**Type consistency:** `sessionOwnedCustomerCodes(req): Promise<Set<string>|null>`, `fetchModelRecord`/`resolveCsCreds`/`isProfileModel` (existing), `brokerDocUrl(model,id,kind,realFileUrl)`, and the broker path shape `/api/profile/document/<model>/<id>?kind=<k>` are identical across Tasks 1–3 and the tests. `DocumentRow.pdf/barcodePdf/csv` now hold same-origin broker paths (still `string|undefined`).

**Dependencies/notes:** (1) Traefik must lock `/documenti-clienti/` to server-only after deploy (interim basic-auth until then); (2) if the server can't reach the public file URL, set `DOCUMENTI_CLIENTI_INTERNAL_BASE`; (3) follow-on (separate): apply the same session-derived scoping to the `/api/profile/[model]` **list** route so a tampered client can't list another customer's documents either (closes SEC-6 fully).
