# Coupon Flow (MyMB) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicate the Deodato/MyMB PHP coupon flow in vinc-b2b (time theme): validate + persist + re-display a coupon on cart/checkout, plus per-article promo on product detail, with a static config now and a channel-scoped data-model config later.

**Architecture:** Three layers. (1) A dedicated `CouponClient` in the vendored `vinc-erp` package calls four MyMB GET services over its own Basic-auth connection. (2) Four new cases in the existing `/api/erp/[...path]` proxy route resolve the coupon config via a single `resolveCouponConfig` seam, build a `CouponClient`, and echo MyMB JSON. (3) Time-theme frontend (`useCoupon` hook, `CouponBox`, `CartTotals` discount line, checkout re-display, product-detail promo) drives it. The MyMB backend is the authoritative re-pricer; JS math is display-only.

**Tech Stack:** TypeScript, Next.js 15 (App Router), React, Vitest, the local `vinc-erp` package (`file:vendor/vinc-erp`, built with `tsc` to `dist/`), existing `parseMyMbConnection` + `ERP_STATIC`.

**Spec:** `docs/superpowers/specs/2026-06-09-coupon-flow-design.md`

**Key facts for the implementer:**
- vinc-b2b imports `vinc-erp` from its built `dist/` (`"main": "./dist/index.js"`). **After any edit under `vendor/vinc-erp/src`, you MUST rebuild the package** (`cd vendor/vinc-erp && npm run build`) or vinc-b2b will keep using stale code.
- `vinc-erp` uses `.js` extensions in import specifiers (NodeNext/ESM TS). Match that in new files.
- Proxy route returns `{ status: 'success', data }` on success and `{ status: 'error', message }` (HTTP 502 from the outer catch) on thrown errors. Handled "soft" cases (disabled, no coupon on cart) return HTTP 200 with `{ status: 'error', message }` so the frontend treats them as non-fatal.
- Frontend reads `customer_code`, `address_code`, `id_cart` from `ERP_STATIC` in `src/framework/basic-rest/utils/static.ts`.
- Run `vinc-erp` tests with `cd vendor/vinc-erp && npm test`. Run vinc-b2b tests with `pnpm vitest run <file>` from the repo root.

---

## File Structure

**vinc-erp package (`vendor/vinc-erp/src/`):**
- `endpoints.ts` (modify) — add `MYMB_COUPON_ENDPOINTS`.
- `mymb/request.ts` (create) — shared `mymbRequest` transport helper (Basic auth GET/POST + HTTP error → `ErpError`).
- `mymb/mymb-erp-client.ts` (modify) — delegate its private `request` to `mymbRequest` (DRY; existing tests are the safety net).
- `mymb/coupon-client.ts` (create) — `CouponClient` with four methods + response types.
- `index.ts` (modify) — export `CouponClient`, `MYMB_COUPON_ENDPOINTS`, coupon types.

**vinc-b2b server (`src/`):**
- `lib/erp/coupon-config.ts` (create) — `CouponConfig`, `DEFAULT_COUPON_CONFIG`, `resolveCouponConfig`, `fetchCouponSettings`.
- `app/api/erp/[...path]/route.ts` (modify) — four coupon cases.

**vinc-b2b frontend — time theme only (`src/`):** The time theme has **no separate cart page** — there is one `/checkout` route (`src/app/[lang]/(default)/checkout/page.tsx` → `TimeCheckoutPage` → `TimeCartTable` + `TimeOrderSummary`). `time-cart.tsx` is only the mini-cart drawer. Per the approved flow ("Apply previews; persist at order submit"), the coupon input + discount display + persistence all live on `TimeOrderSummary`.
- `lib/coupon/discount.ts` (create) — pure `applyCouponDiscount(totals, percent)` display math.
- `hooks/use-coupon.ts` (create) — `useCoupon` hook (validate-only `applyCoupon`, `persistCoupon`, `checkCouponCart`) + `verifyPromoItem` helper.
- `components/themes/time/cart/time-coupon-field.tsx` (create) — presentational coupon input row.
- `components/themes/time/cart/time-order-summary.tsx` (modify) — render the coupon field, add a discount line to the totals, `checkCouponCart()` on mount, and `persistCoupon()` in `handleSubmit` before `submitOrder`.
- `components/themes/time/product/time-product-detail.tsx` (modify) — per-article promo via `verifyPromoItem`.
- `app/i18n/locales/<lang>/common.json` (modify) — coupon keys (the `common` namespace `TimeOrderSummary` already uses).
- `.env.example` (modify).

> Flow note (adapts the spec's two-page assumption to this app's single `/checkout` page): `Applica` only validates and updates the display math; the coupon is persisted via `submit_coupon` inside the existing order-submit CTA, just before `submitOrder`. There is **no redirect step**. `checkCouponCart()` on mount re-displays a coupon already saved on the cart.

---

## Task 1: Coupon endpoint constants (vinc-erp)

**Files:**
- Modify: `vendor/vinc-erp/src/endpoints.ts`
- Test: `vendor/vinc-erp/src/__tests__/endpoints.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// vendor/vinc-erp/src/__tests__/endpoints.test.ts
import { describe, it, expect } from 'vitest';
import { MYMB_COUPON_ENDPOINTS } from '../endpoints.js';

describe('MYMB_COUPON_ENDPOINTS', () => {
  it('maps the four coupon services to their MyMB names', () => {
    expect(MYMB_COUPON_ENDPOINTS.GET_STATO_COUPON_CLIENTE).toBe('GetStatoCouponCliente');
    expect(MYMB_COUPON_ENDPOINTS.GET_INFO_COUPON_FROM_DOCUMENTO).toBe('GetInfoCouponFromDocumento');
    expect(MYMB_COUPON_ENDPOINTS.UPDATE_TESTATA_DOCUMENTO_CON_COUPON).toBe('UpdateTestataDocumentoConCoupon');
    expect(MYMB_COUPON_ENDPOINTS.GET_PROMOZIONE_BASE_X_ARTICOLO).toBe('GetPromozioneBaseXArticolo');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendor/vinc-erp && npx vitest run src/__tests__/endpoints.test.ts`
Expected: FAIL — `MYMB_COUPON_ENDPOINTS` is not exported.

- [ ] **Step 3: Add the constants**

Append to `vendor/vinc-erp/src/endpoints.ts`:

```ts
/** Raw MYMB coupon webservice endpoints (separate connection from pricing). */
export const MYMB_COUPON_ENDPOINTS = {
  GET_STATO_COUPON_CLIENTE: 'GetStatoCouponCliente',
  GET_INFO_COUPON_FROM_DOCUMENTO: 'GetInfoCouponFromDocumento',
  UPDATE_TESTATA_DOCUMENTO_CON_COUPON: 'UpdateTestataDocumentoConCoupon',
  GET_PROMOZIONE_BASE_X_ARTICOLO: 'GetPromozioneBaseXArticolo',
} as const;

export type MyMbCouponEndpoint =
  (typeof MYMB_COUPON_ENDPOINTS)[keyof typeof MYMB_COUPON_ENDPOINTS];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vendor/vinc-erp && npx vitest run src/__tests__/endpoints.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add vendor/vinc-erp/src/endpoints.ts vendor/vinc-erp/src/__tests__/endpoints.test.ts
git commit -m "feat(vinc-erp): add MyMB coupon endpoint constants"
```

---

## Task 2: Shared `mymbRequest` transport helper (vinc-erp)

Extract the Basic-auth fetch (currently `MyMbErpClient.request`) into a free function so `CouponClient` and `MyMbErpClient` share one transport (DRY).

**Files:**
- Create: `vendor/vinc-erp/src/mymb/request.ts`
- Modify: `vendor/vinc-erp/src/mymb/mymb-erp-client.ts`
- Test: `vendor/vinc-erp/src/__tests__/request.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// vendor/vinc-erp/src/__tests__/request.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mymbRequest } from '../mymb/request.js';
import { ErpError } from '../erp-client.js';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  });
}

describe('mymbRequest', () => {
  it('GET: builds the URL with params + Basic auth header, returns parsed JSON', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: 1 }));
    const out = await mymbRequest('http://erp:8884/MyMB/web', 'Basic xyz', 'GetX', {
      method: 'GET', params: { a: '1', b: undefined }, fetchImpl,
    });
    expect(out).toEqual({ ok: 1 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe('http://erp:8884/MyMB/web/GetX?a=1');
    expect((init as RequestInit).method).toBe('GET');
    expect((init as any).headers.Authorization).toBe('Basic xyz');
  });

  it('throws ErpError on non-OK HTTP', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 500));
    await expect(
      mymbRequest('http://erp/web', 'Basic xyz', 'GetX', { method: 'GET', fetchImpl }),
    ).rejects.toBeInstanceOf(ErpError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendor/vinc-erp && npx vitest run src/__tests__/request.test.ts`
Expected: FAIL — `../mymb/request.js` not found.

- [ ] **Step 3: Create the helper**

```ts
// vendor/vinc-erp/src/mymb/request.ts
import { ErpError } from '../erp-client.js';

export interface MymbRequestOpts {
  method?: 'GET' | 'POST';
  params?: Record<string, unknown>;
  body?: unknown;
  fetchImpl?: typeof fetch;
}

/** MYMB transport: Basic auth, optional query params / JSON body, HTTP-error → ErpError. */
export async function mymbRequest<T = any>(
  baseUrl: string,
  authHeader: string,
  endpoint: string,
  opts: MymbRequestOpts = {},
): Promise<T> {
  const method = opts.method ?? 'POST';
  const doFetch = opts.fetchImpl ?? fetch;
  const url = new URL(`${baseUrl}/${endpoint}`);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  let res: Response;
  try {
    res = await doFetch(url.toString(), {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: method === 'POST' && opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    throw new ErpError(`ERP request failed: ${(err as Error).message}`, { endpoint });
  }
  if (!res.ok) {
    throw new ErpError(`ERP request failed: HTTP ${res.status}`, { endpoint, status: res.status });
  }
  return (await res.json()) as T;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vendor/vinc-erp && npx vitest run src/__tests__/request.test.ts`
Expected: PASS.

- [ ] **Step 5: Refactor `MyMbErpClient.request` to delegate**

In `vendor/vinc-erp/src/mymb/mymb-erp-client.ts`, add the import at top:

```ts
import { mymbRequest } from './request.js';
```

Replace the entire body of the private `request` method with a delegation (keep its signature identical):

```ts
  private async request<T = any>(
    endpoint: string,
    opts: { method?: 'GET' | 'POST'; params?: Record<string, unknown>; body?: unknown } = {},
  ): Promise<T> {
    return mymbRequest<T>(this.baseUrl, this.authHeader, endpoint, {
      method: opts.method,
      params: opts.params,
      body: opts.body,
      fetchImpl: this.fetchImpl,
    });
  }
```

- [ ] **Step 6: Run the full vinc-erp suite to confirm no regression**

Run: `cd vendor/vinc-erp && npm test`
Expected: PASS (existing `mymb-erp-client.test.ts` covers the delegated path; all green).

- [ ] **Step 7: Commit**

```bash
git add vendor/vinc-erp/src/mymb/request.ts vendor/vinc-erp/src/mymb/mymb-erp-client.ts vendor/vinc-erp/src/__tests__/request.test.ts
git commit -m "refactor(vinc-erp): extract shared mymbRequest transport"
```

---

## Task 3: `CouponClient` with four methods (vinc-erp)

**Files:**
- Create: `vendor/vinc-erp/src/mymb/coupon-client.ts`
- Test: `vendor/vinc-erp/src/__tests__/coupon-client.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// vendor/vinc-erp/src/__tests__/coupon-client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CouponClient } from '../mymb/coupon-client.js';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  });
}
function makeClient(fetchImpl: typeof fetch) {
  return new CouponClient({ baseUrl: 'http://coupon:8884/MyMB/web', authHeader: 'Basic abc', fetchImpl });
}

describe('CouponClient', () => {
  it('validateCoupon GETs GetStatoCouponCliente with the two params and returns raw JSON', async () => {
    const raw = { GetStatoCouponClienteResult: { m_Item2: { isValido: 'S', percentualeSconto: '10' } } };
    const fetchImpl = vi.fn(async () => jsonResponse(raw));
    const out = await makeClient(fetchImpl).validateCoupon('C1', 'ABC');
    expect(out).toEqual(raw);
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('/GetStatoCouponCliente?');
    expect(url).toContain('codiceInternoCliente=C1');
    expect(url).toContain('codiceCoupon=ABC');
  });

  it('getCartCoupon GETs GetInfoCouponFromDocumento with idElaborazione', async () => {
    const raw = { GetInfoCouponFromDocumentoResult: { m_Item2: { Codice: 'ABC' } } };
    const fetchImpl = vi.fn(async () => jsonResponse(raw));
    const out = await makeClient(fetchImpl).getCartCoupon('555');
    expect(out).toEqual(raw);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/GetInfoCouponFromDocumento?idElaborazione=555');
  });

  it('submitCoupon GETs UpdateTestataDocumentoConCoupon with idElaborazione + codiceCoupon', async () => {
    const raw = { UpdateTestataDocumentoConCouponResult: { ReturnCode: 0 } };
    const fetchImpl = vi.fn(async () => jsonResponse(raw));
    const out = await makeClient(fetchImpl).submitCoupon('555', 'ABC');
    expect(out).toEqual(raw);
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('/UpdateTestataDocumentoConCoupon?');
    expect(url).toContain('idElaborazione=555');
    expect(url).toContain('codiceCoupon=ABC');
  });

  it('verifyPromoItem GETs GetPromozioneBaseXArticolo with the three params', async () => {
    const raw = { GetPromozioneBaseXArticoloResult: {} };
    const fetchImpl = vi.fn(async () => jsonResponse(raw));
    await makeClient(fetchImpl).verifyPromoItem('C1', 'A1', 'ART1');
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('/GetPromozioneBaseXArticolo?');
    expect(url).toContain('codiceInternoCliente=C1');
    expect(url).toContain('codiceIndirizzo=A1');
    expect(url).toContain('codiceInternoArticolo=ART1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vendor/vinc-erp && npx vitest run src/__tests__/coupon-client.test.ts`
Expected: FAIL — `../mymb/coupon-client.js` not found.

- [ ] **Step 3: Implement `CouponClient`**

```ts
// vendor/vinc-erp/src/mymb/coupon-client.ts
import { MYMB_COUPON_ENDPOINTS } from '../endpoints.js';
import { mymbRequest } from './request.js';

export interface CouponClientConfig {
  /** Base URL, no userinfo, no trailing slash (from parseMyMbConnection). */
  baseUrl: string;
  /** `Basic ...` header value. */
  authHeader: string;
  /** Inject for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/** Validation response from GetStatoCouponCliente. */
export interface CouponValidation {
  GetStatoCouponClienteResult?: {
    m_Item2?: { isValido?: string; Messaggio?: string; percentualeSconto?: string };
  };
}
/** Lookup response from GetInfoCouponFromDocumento. */
export interface CartCouponInfo {
  GetInfoCouponFromDocumentoResult?: { m_Item2?: { Codice?: string } };
}
/** Persistence response from UpdateTestataDocumentoConCoupon. */
export interface CouponPersistResult {
  UpdateTestataDocumentoConCouponResult?: { ReturnCode?: number };
}

/** Thin proxy to the MyMB coupon webservices over a dedicated Basic-auth connection. */
export class CouponClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(config: CouponClientConfig) {
    this.baseUrl = config.baseUrl;
    this.authHeader = config.authHeader;
    this.fetchImpl = config.fetchImpl;
  }

  private get(endpoint: string, params: Record<string, unknown>) {
    return mymbRequest<any>(this.baseUrl, this.authHeader, endpoint, {
      method: 'GET', params, fetchImpl: this.fetchImpl,
    });
  }

  validateCoupon(cliente: string, coupon: string): Promise<CouponValidation> {
    return this.get(MYMB_COUPON_ENDPOINTS.GET_STATO_COUPON_CLIENTE, {
      codiceInternoCliente: cliente, codiceCoupon: coupon,
    });
  }

  getCartCoupon(idCart: string | number): Promise<CartCouponInfo> {
    return this.get(MYMB_COUPON_ENDPOINTS.GET_INFO_COUPON_FROM_DOCUMENTO, {
      idElaborazione: idCart,
    });
  }

  submitCoupon(idElaborazione: string | number, coupon: string): Promise<CouponPersistResult> {
    return this.get(MYMB_COUPON_ENDPOINTS.UPDATE_TESTATA_DOCUMENTO_CON_COUPON, {
      idElaborazione, codiceCoupon: coupon,
    });
  }

  verifyPromoItem(cliente: string, indirizzo: string, articolo: string): Promise<any> {
    return this.get(MYMB_COUPON_ENDPOINTS.GET_PROMOZIONE_BASE_X_ARTICOLO, {
      codiceInternoCliente: cliente, codiceIndirizzo: indirizzo, codiceInternoArticolo: articolo,
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vendor/vinc-erp && npx vitest run src/__tests__/coupon-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add vendor/vinc-erp/src/mymb/coupon-client.ts vendor/vinc-erp/src/__tests__/coupon-client.test.ts
git commit -m "feat(vinc-erp): add CouponClient for MyMB coupon services"
```

---

## Task 4: Export coupon API + build the package

**Files:**
- Modify: `vendor/vinc-erp/src/index.ts`

- [ ] **Step 1: Add exports**

Append to `vendor/vinc-erp/src/index.ts`:

```ts
// Coupon endpoints + client
export { MYMB_COUPON_ENDPOINTS } from './endpoints.js';
export type { MyMbCouponEndpoint } from './endpoints.js';
export { CouponClient } from './mymb/coupon-client.js';
export type {
  CouponClientConfig,
  CouponValidation,
  CartCouponInfo,
  CouponPersistResult,
} from './mymb/coupon-client.js';
export { mymbRequest } from './mymb/request.js';
export type { MymbRequestOpts } from './mymb/request.js';
```

- [ ] **Step 2: Build the package and run its full suite**

Run: `cd vendor/vinc-erp && npm run build && npm test`
Expected: `tsc` exits 0; all tests PASS. (The build refreshes `dist/` so vinc-b2b picks up `CouponClient`.)

- [ ] **Step 3: Verify vinc-b2b can import it**

Run from repo root: `node -e "const m = require('./vendor/vinc-erp/dist/index.js'); if (!m.CouponClient) throw new Error('CouponClient missing'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add vendor/vinc-erp/src/index.ts vendor/vinc-erp/dist
git commit -m "chore(vinc-erp): export CouponClient + rebuild dist"
```

> Note: if `vendor/vinc-erp/dist` is gitignored in this repo, drop it from the `git add` and just commit `src/index.ts`. Confirm with `git check-ignore vendor/vinc-erp/dist`.

---

## Task 5: `coupon-config.ts` — static config + phase seam (vinc-b2b)

**Files:**
- Create: `src/lib/erp/coupon-config.ts`
- Test: `src/test/unit/coupon-config.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// src/test/unit/coupon-config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveCouponConfigFromEnv, mapCouponRecord, DEFAULT_COUPON_CONFIG } from '@/lib/erp/coupon-config';

describe('coupon-config (static)', () => {
  const OLD = { ...process.env };
  beforeEach(() => { delete process.env.COUPON_API_URL; delete process.env.COUPON_API_USER; delete process.env.COUPON_API_PASSWORD; });
  afterEach(() => { process.env = { ...OLD }; });

  it('parses embedded credentials from COUPON_API_URL', () => {
    process.env.COUPON_API_URL = 'http://U:P@mymb:8884/MyMB/Service/web';
    const cfg = resolveCouponConfigFromEnv();
    expect(cfg.enabled).toBe(true);
    expect(cfg.baseUrl).toBe('http://mymb:8884/MyMB/Service/web');
    expect(cfg.authHeader).toBe('Basic ' + Buffer.from('U:P').toString('base64'));
  });

  it('uses COUPON_API_USER/PASSWORD when the URL has no creds', () => {
    process.env.COUPON_API_URL = 'http://mymb:8884/MyMB/Service/web';
    process.env.COUPON_API_USER = 'U';
    process.env.COUPON_API_PASSWORD = 'P';
    const cfg = resolveCouponConfigFromEnv();
    expect(cfg.baseUrl).toBe('http://mymb:8884/MyMB/Service/web');
    expect(cfg.authHeader).toBe('Basic ' + Buffer.from('U:P').toString('base64'));
  });

  it('falls back to DEFAULT_COUPON_CONFIG (still enabled, empty url) when env is absent', () => {
    expect(resolveCouponConfigFromEnv()).toEqual(DEFAULT_COUPON_CONFIG);
  });

  it('mapCouponRecord builds config from a data-model record + env creds', () => {
    process.env.COUPON_API_USER = 'U';
    process.env.COUPON_API_PASSWORD = 'P';
    const cfg = mapCouponRecord({ enabled: false, api_url: 'http://mymb:8884/MyMB/Service/web' });
    expect(cfg.enabled).toBe(false);
    expect(cfg.baseUrl).toBe('http://mymb:8884/MyMB/Service/web');
    expect(cfg.authHeader).toBe('Basic ' + Buffer.from('U:P').toString('base64'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/test/unit/coupon-config.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the config module**

```ts
// src/lib/erp/coupon-config.ts
import type { NextRequest } from 'next/server';
import { parseMyMbConnection } from 'vinc-erp';

export type CouponConfig = {
  enabled: boolean;
  baseUrl: string;    // e.g. http://mymb.baseprotection.com:8884/MyMB/Service/web
  authHeader: string; // "Basic " + base64(user:pass)
};

/** Feature is active by default; empty connection means the proxy short-circuits. */
export const DEFAULT_COUPON_CONFIG: CouponConfig = {
  enabled: true, baseUrl: '', authHeader: '',
};

/** Build a Basic auth header from explicit user/pass env (used when the URL has no creds). */
function authFromEnv(): string {
  const user = process.env.COUPON_API_USER;
  const pass = process.env.COUPON_API_PASSWORD;
  if (!user || !pass) return '';
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

/** Phase 1: read static config from env. */
export function resolveCouponConfigFromEnv(): CouponConfig {
  const url = process.env.COUPON_API_URL;
  if (!url) return DEFAULT_COUPON_CONFIG;
  try {
    // Try embedded creds first; fall back to plain URL + env creds.
    try {
      const { baseUrl, authHeader } = parseMyMbConnection(url);
      return { enabled: true, baseUrl, authHeader };
    } catch {
      const baseUrl = url.replace(/\/+$/, '');
      return { enabled: true, baseUrl, authHeader: authFromEnv() };
    }
  } catch {
    return DEFAULT_COUPON_CONFIG;
  }
}

/** Phase 2: map a `coupon_settings` data-model record `data` to typed config. Pure. */
export function mapCouponRecord(data: Record<string, unknown>): CouponConfig {
  const baseUrl = String(data.api_url ?? '').replace(/\/+$/, '');
  return {
    enabled: data.enabled === undefined ? true : Boolean(data.enabled),
    baseUrl,
    authHeader: authFromEnv(),
  };
}

/**
 * The single phase seam. Phase 1 returns the static env config. Phase 2 (Task 7)
 * swaps the body to read the channel-scoped `coupon_settings` model.
 */
export async function resolveCouponConfig(_req: NextRequest): Promise<CouponConfig> {
  return resolveCouponConfigFromEnv();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/test/unit/coupon-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/erp/coupon-config.ts src/test/unit/coupon-config.test.ts
git commit -m "feat(coupon): static coupon config + phase seam"
```

---

## Task 6: Proxy route coupon cases (vinc-b2b)

**Files:**
- Modify: `src/app/api/erp/[...path]/route.ts`
- Test: `src/test/api/coupon-route.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// src/test/api/coupon-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const validateCoupon = vi.fn();
const getCartCoupon = vi.fn();
const submitCoupon = vi.fn();
const verifyPromoItem = vi.fn();

vi.mock('vinc-erp', async (orig) => {
  const actual = await (orig as any)();
  return { ...actual, CouponClient: vi.fn(() => ({ validateCoupon, getCartCoupon, submitCoupon, verifyPromoItem })) };
});

const resolveCouponConfig = vi.fn();
vi.mock('@/lib/erp/coupon-config', () => ({ resolveCouponConfig }));
// get_multiple_prices path is untouched; stub the ERP factory so the module imports cleanly.
vi.mock('@/lib/erp/factory', () => ({ getMyMbErpClient: vi.fn() }));

import { POST } from '@/app/api/erp/[...path]/route';
import { NextRequest } from 'next/server';

function req(path: string, body: unknown) {
  return new NextRequest(`http://localhost/api/erp/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}
const params = (p: string) => ({ params: Promise.resolve({ path: [p] }) });

describe('coupon proxy cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCouponConfig.mockResolvedValue({ enabled: true, baseUrl: 'http://c/web', authHeader: 'Basic x' });
  });

  it('validate_coupon echoes the MyMB JSON', async () => {
    const raw = { GetStatoCouponClienteResult: { m_Item2: { isValido: 'S', percentualeSconto: '10' } } };
    validateCoupon.mockResolvedValue(raw);
    const res = await POST(req('validate_coupon', { codiceInternoCliente: 'C', codiceCoupon: 'AB' }), params('validate_coupon'));
    const json = await res.json();
    expect(json).toEqual({ status: 'success', data: raw });
    expect(validateCoupon).toHaveBeenCalledWith('C', 'AB');
  });

  it('check_coupon_cart does the two-step lookup + validation', async () => {
    getCartCoupon.mockResolvedValue({ GetInfoCouponFromDocumentoResult: { m_Item2: { Codice: 'AB' } } });
    const raw = { GetStatoCouponClienteResult: { m_Item2: { isValido: 'S', percentualeSconto: '5' } } };
    validateCoupon.mockResolvedValue(raw);
    const res = await POST(req('check_coupon_cart', { codiceInternoCliente: 'C', id_cart: '9' }), params('check_coupon_cart'));
    const json = await res.json();
    expect(getCartCoupon).toHaveBeenCalledWith('9');
    expect(validateCoupon).toHaveBeenCalledWith('C', 'AB');
    expect(json).toEqual({ status: 'success', data: raw });
  });

  it('check_coupon_cart with no coupon on the cart returns a soft error', async () => {
    getCartCoupon.mockResolvedValue({ GetInfoCouponFromDocumentoResult: { m_Item2: {} } });
    const res = await POST(req('check_coupon_cart', { codiceInternoCliente: 'C', id_cart: '9' }), params('check_coupon_cart'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('error');
    expect(validateCoupon).not.toHaveBeenCalled();
  });

  it('submit_coupon forwards idElaborazione + codiceCoupon', async () => {
    const raw = { UpdateTestataDocumentoConCouponResult: { ReturnCode: 0 } };
    submitCoupon.mockResolvedValue(raw);
    const res = await POST(req('submit_coupon', { idElaborazione: '9', codiceCoupon: 'AB' }), params('submit_coupon'));
    const json = await res.json();
    expect(submitCoupon).toHaveBeenCalledWith('9', 'AB');
    expect(json).toEqual({ status: 'success', data: raw });
  });

  it('disabled config short-circuits without calling MyMB', async () => {
    resolveCouponConfig.mockResolvedValue({ enabled: false, baseUrl: '', authHeader: '' });
    const res = await POST(req('validate_coupon', { codiceInternoCliente: 'C', codiceCoupon: 'AB' }), params('validate_coupon'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('error');
    expect(validateCoupon).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/test/api/coupon-route.test.ts`
Expected: FAIL — coupon cases hit the `default` 404 branch / `CouponClient` not used.

- [ ] **Step 3: Add imports + a coupon dispatcher to the route**

At the top of `src/app/api/erp/[...path]/route.ts`, add:

```ts
import { CouponClient } from 'vinc-erp';
import { resolveCouponConfig } from '@/lib/erp/coupon-config';
```

Add this helper above the `POST` function (module scope):

```ts
const COUPON_ENDPOINTS = new Set([
  'validate_coupon', 'check_coupon_cart', 'submit_coupon', 'verify_promo_item',
]);

async function handleCoupon(
  endpoint: string,
  body: any,
  req: NextRequest,
): Promise<NextResponse> {
  const cfg = await resolveCouponConfig(req);
  if (!cfg.enabled || !cfg.baseUrl) {
    return NextResponse.json({ status: 'error', message: 'Coupons not enabled' });
  }
  const client = new CouponClient({ baseUrl: cfg.baseUrl, authHeader: cfg.authHeader });

  switch (endpoint) {
    case 'validate_coupon': {
      const data = await client.validateCoupon(body.codiceInternoCliente, body.codiceCoupon);
      return NextResponse.json({ status: 'success', data });
    }
    case 'check_coupon_cart': {
      const info = await client.getCartCoupon(body.id_cart);
      const codice = info?.GetInfoCouponFromDocumentoResult?.m_Item2?.Codice;
      if (!codice) {
        return NextResponse.json({ status: 'error', message: 'No coupon on cart' });
      }
      const data = await client.validateCoupon(body.codiceInternoCliente, codice);
      return NextResponse.json({ status: 'success', data });
    }
    case 'submit_coupon': {
      const data = await client.submitCoupon(body.idElaborazione, body.codiceCoupon);
      return NextResponse.json({ status: 'success', data });
    }
    case 'verify_promo_item': {
      const data = await client.verifyPromoItem(
        body.codiceInternoCliente, body.codiceIndirizzo, body.codiceInternoArticolo,
      );
      return NextResponse.json({ status: 'success', data });
    }
    default:
      return NextResponse.json({ status: 'error', message: `Unknown coupon endpoint: ${endpoint}` }, { status: 404 });
  }
}
```

Inside `POST`, immediately after `body` is parsed and **before** `const client = await getMyMbErpClient(req);`, add the dispatch:

```ts
  if (COUPON_ENDPOINTS.has(endpoint)) {
    try {
      return await handleCoupon(endpoint, body, req);
    } catch (error) {
      console.error(`[ERP route] coupon ${endpoint} failed:`, error);
      return NextResponse.json({ status: 'error', message: (error as Error).message }, { status: 502 });
    }
  }
```

(The coupon branch returns before reaching the ERP `switch`, so the existing pricing path is untouched.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/test/api/coupon-route.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the existing ERP route test to confirm no regression**

Run: `pnpm vitest run src/test/api/erp-route.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/erp/[...path]/route.ts src/test/api/coupon-route.test.ts
git commit -m "feat(coupon): proxy route cases for the four MyMB coupon services"
```

---

## Task 7: `fetchCouponSettings` — wire phase-2 read into the seam (vinc-b2b)

Implements the dynamic read but keeps phase-1 behavior as the fallback so nothing breaks before the CS model exists.

**Files:**
- Modify: `src/lib/erp/coupon-config.ts`
- Test: `src/test/unit/coupon-config.test.ts` (extend)

- [ ] **Step 1: Add the failing test**

Append inside `src/test/unit/coupon-config.test.ts`:

```ts
import { fetchCouponSettings } from '@/lib/erp/coupon-config';

describe('coupon-config (dynamic)', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('maps a coupon_settings record from CS', async () => {
    process.env.COUPON_API_USER = 'U'; process.env.COUPON_API_PASSWORD = 'P';
    global.fetch = (async () => new Response(JSON.stringify({
      data: { items: [{ data: { enabled: true, api_url: 'http://mymb:8884/MyMB/Service/web' } }] },
    }), { status: 200 })) as any;
    const cfg = await fetchCouponSettings({ csBaseUrl: 'http://cs', apiKeyId: 'k', apiSecret: 's', channel: 'b2b' });
    expect(cfg.baseUrl).toBe('http://mymb:8884/MyMB/Service/web');
    expect(cfg.enabled).toBe(true);
  });

  it('falls back to default when the record is absent', async () => {
    global.fetch = (async () => new Response(JSON.stringify({ data: { items: [] } }), { status: 200 })) as any;
    const cfg = await fetchCouponSettings({ csBaseUrl: 'http://cs', apiKeyId: 'k', apiSecret: 's', channel: 'b2b' });
    expect(cfg).toEqual(DEFAULT_COUPON_CONFIG);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/test/unit/coupon-config.test.ts`
Expected: FAIL — `fetchCouponSettings` not exported.

- [ ] **Step 3: Implement `fetchCouponSettings`**

Append to `src/lib/erp/coupon-config.ts`:

```ts
interface FetchCouponArgs {
  csBaseUrl: string;
  apiKeyId: string;
  apiSecret: string;
  channel: string;
}

/**
 * Phase 2: fetch the channel-scoped `coupon_settings` record from Commerce Suite
 * (mirrors fetchErpSettings). Returns DEFAULT_COUPON_CONFIG when absent.
 */
export async function fetchCouponSettings(args: FetchCouponArgs): Promise<CouponConfig> {
  const url = new URL(
    `${args.csBaseUrl.replace(/\/+$/, '')}/api/b2b/data-models/coupon_settings/records`,
  );
  url.searchParams.set('channel', args.channel);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'x-auth-method': 'api-key',
      'x-api-key-id': args.apiKeyId,
      'x-api-secret': args.apiSecret,
    },
  });
  if (!res.ok) return DEFAULT_COUPON_CONFIG;

  const json: any = await res.json();
  const record = json?.data?.items?.[0];
  if (!record?.data) return DEFAULT_COUPON_CONFIG;
  return mapCouponRecord(record.data as Record<string, unknown>);
}
```

> Note: leave `resolveCouponConfig` calling `resolveCouponConfigFromEnv()` for now. Flipping the seam to `fetchCouponSettings` happens once the CS `coupon_settings` model is defined (tracked separately); to flip, replace the body of `resolveCouponConfig` with the tenant-bits lookup used by `factory.ts` (`csBaseUrl`/`apiKeyId`/`apiSecret` + channel) and call `fetchCouponSettings`. Until then env config is authoritative and the feature stays active.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/test/unit/coupon-config.test.ts`
Expected: PASS (all coupon-config tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/erp/coupon-config.ts src/test/unit/coupon-config.test.ts
git commit -m "feat(coupon): channel-scoped fetchCouponSettings (phase-2 read)"
```

---

## Task 8: Pure coupon discount helper (vinc-b2b)

The time-theme totals are rendered inline in `TimeOrderSummary`, not via a shared
`CartTotals`. Extract the display math into a pure, unit-tested helper so the
component just calls it.

**Files:**
- Create: `src/lib/coupon/discount.ts`
- Test: `src/test/unit/coupon-discount.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// src/test/unit/coupon-discount.test.ts
import { describe, it, expect } from 'vitest';
import { applyCouponDiscount } from '@/lib/coupon/discount';

describe('applyCouponDiscount', () => {
  it('returns inputs unchanged for a zero / missing percent', () => {
    expect(applyCouponDiscount({ net: 100, vat: 22 }, 0)).toEqual({ net: 100, vat: 22, doc: 122, discount: 0 });
    expect(applyCouponDiscount({ net: 100, vat: 22 })).toEqual({ net: 100, vat: 22, doc: 122, discount: 0 });
  });

  it('reduces net + vat by the percent and reports the discount amount', () => {
    const r = applyCouponDiscount({ net: 100, vat: 22 }, 10);
    expect(r.net).toBeCloseTo(90);
    expect(r.vat).toBeCloseTo(19.8);
    expect(r.doc).toBeCloseTo(109.8);
    expect(r.discount).toBeCloseTo(12.2); // (100+22) * 10%
  });

  it('clamps a negative or >100 percent to a sane range', () => {
    expect(applyCouponDiscount({ net: 100, vat: 0 }, -5).net).toBe(100);
    expect(applyCouponDiscount({ net: 100, vat: 0 }, 150).net).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/test/unit/coupon-discount.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// src/lib/coupon/discount.ts

export interface DiscountableTotals {
  net: number;
  vat: number;
}

export interface DiscountedTotals {
  net: number;
  vat: number;
  doc: number;
  /** Absolute amount removed from (net + vat). */
  discount: number;
}

/**
 * Display-only coupon math (the MyMB backend is the authoritative re-pricer).
 * Reduces net and vat by `percent` and returns the recomputed document total.
 */
export function applyCouponDiscount(
  totals: DiscountableTotals,
  percent = 0,
): DiscountedTotals {
  const p = Math.min(100, Math.max(0, percent || 0));
  const net = totals.net - (totals.net * p) / 100;
  const vat = totals.vat - (totals.vat * p) / 100;
  const doc = net + vat;
  const discount = (totals.net + totals.vat) * (p / 100);
  return { net, vat, doc, discount };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/test/unit/coupon-discount.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coupon/discount.ts src/test/unit/coupon-discount.test.ts
git commit -m "feat(coupon): pure discount display-math helper"
```

---

## Task 9: `useCoupon` hook + `verifyPromoItem` (vinc-b2b)

Validate-only `applyCoupon` (no persist, no redirect — per the approved flow),
`persistCoupon` (called by the order-submit CTA), `checkCouponCart` (mount
re-display), and the standalone `verifyPromoItem` helper for the product page.

**Files:**
- Create: `src/hooks/use-coupon.ts`
- Test: `src/test/unit/use-coupon.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

```tsx
// src/test/unit/use-coupon.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCoupon, verifyPromoItem } from '@/hooks/use-coupon';

const okValidate = { status: 'success', data: { GetStatoCouponClienteResult: { m_Item2: { isValido: 'S', percentualeSconto: '10', Messaggio: 'ok' } } } };
const okPersist = { status: 'success', data: { UpdateTestataDocumentoConCouponResult: { ReturnCode: 0 } } };

describe('useCoupon', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('applyCoupon validates only and sets discountPercent (no persist call)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(okValidate)));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCoupon({ customerCode: 'C', idCart: '9' }));
    await act(async () => { await result.current.applyCoupon('AB'); });
    expect(result.current.discountPercent).toBe(10);
    expect(result.current.status).toBe('valid');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/erp/validate_coupon');
  });

  it('applyCoupon surfaces the message + zero discount on an invalid coupon', async () => {
    const bad = { status: 'success', data: { GetStatoCouponClienteResult: { m_Item2: { isValido: 'N', Messaggio: 'nope' } } } };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(bad))));
    const { result } = renderHook(() => useCoupon({ customerCode: 'C', idCart: '9' }));
    await act(async () => { await result.current.applyCoupon('AB'); });
    expect(result.current.discountPercent).toBe(0);
    expect(result.current.status).toBe('invalid');
    expect(result.current.message).toBe('nope');
  });

  it('persistCoupon posts submit_coupon only when a valid coupon is applied', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(okValidate)))   // applyCoupon
      .mockResolvedValueOnce(new Response(JSON.stringify(okPersist)));   // persistCoupon
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCoupon({ customerCode: 'C', idCart: '9' }));
    await act(async () => { await result.current.applyCoupon('AB'); });
    let ok = false;
    await act(async () => { ok = await result.current.persistCoupon(); });
    expect(ok).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/erp/submit_coupon');
    const body = JSON.parse((fetchMock.mock.calls[1][1] as any).body);
    expect(body).toEqual({ idElaborazione: '9', codiceCoupon: 'AB' });
  });

  it('persistCoupon is a no-op (returns false) when no valid coupon is applied', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCoupon({ customerCode: 'C', idCart: '9' }));
    let ok = true;
    await act(async () => { ok = await result.current.persistCoupon(); });
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('verifyPromoItem', () => {
  it('posts the three params and returns data on success', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'success', data: { promo: 1 } })));
    vi.stubGlobal('fetch', fetchMock);
    const out = await verifyPromoItem('C', 'A', 'ART1');
    expect(out).toEqual({ promo: 1 });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body).toEqual({ codiceInternoCliente: 'C', codiceIndirizzo: 'A', codiceInternoArticolo: 'ART1' });
  });

  it('returns null when the customer is missing', async () => {
    expect(await verifyPromoItem('0', 'A', 'ART1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/test/unit/use-coupon.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook + helper**

```ts
// src/hooks/use-coupon.ts
'use client';

import { useCallback, useState } from 'react';

type Status = 'idle' | 'loading' | 'valid' | 'invalid' | 'error';

export interface UseCouponArgs {
  customerCode: string;
  idCart: string | number;
}

const ERP = (endpoint: string, body: unknown) =>
  fetch(`/api/erp/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());

function readValidation(json: any): { ok: boolean; percent: number; message: string } {
  const m = json?.data?.GetStatoCouponClienteResult?.m_Item2 ?? {};
  const ok = m.isValido === 'S';
  const percent = ok ? Math.abs(parseFloat(m.percentualeSconto ?? '0')) || 0 : 0;
  return { ok, percent, message: m.Messaggio ?? '' };
}

export function useCoupon({ customerCode, idCart }: UseCouponArgs) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [message, setMessage] = useState('');

  /** Validate only — display math, no persistence (persist happens at order submit). */
  const applyCoupon = useCallback(async (input: string) => {
    setStatus('loading'); setMessage('');
    try {
      const json = await ERP('validate_coupon', { codiceInternoCliente: customerCode, codiceCoupon: input });
      if (json?.status !== 'success') {
        setStatus('error'); setMessage(json?.message ?? 'Errore'); setDiscountPercent(0); return false;
      }
      const v = readValidation(json);
      setCode(input);
      setDiscountPercent(v.percent); setMessage(v.message);
      setStatus(v.ok ? 'valid' : 'invalid');
      return v.ok;
    } catch (e) {
      setStatus('error'); setMessage((e as Error).message); setDiscountPercent(0); return false;
    }
  }, [customerCode]);

  /** Persist the applied coupon onto the cart/document. Called by the order-submit CTA. */
  const persistCoupon = useCallback(async (): Promise<boolean> => {
    if (status !== 'valid' || !code) return false;
    try {
      const json = await ERP('submit_coupon', { idElaborazione: idCart, codiceCoupon: code });
      const rc = json?.data?.UpdateTestataDocumentoConCouponResult?.ReturnCode;
      return json?.status === 'success' && rc === 0;
    } catch {
      return false;
    }
  }, [status, code, idCart]);

  /** Re-display a coupon already saved on the cart (checkout mount). */
  const checkCouponCart = useCallback(async () => {
    try {
      const json = await ERP('check_coupon_cart', { codiceInternoCliente: customerCode, id_cart: idCart });
      if (json?.status !== 'success') { setStatus('idle'); setDiscountPercent(0); return; }
      const v = readValidation(json);
      setDiscountPercent(v.percent); setMessage(v.message); setStatus(v.ok ? 'valid' : 'invalid');
    } catch {
      setStatus('idle'); setDiscountPercent(0);
    }
  }, [customerCode, idCart]);

  return { code, setCode, status, discountPercent, message, applyCoupon, persistCoupon, checkCouponCart };
}

/** Per-article promo (separate from coupons). Returns the raw MyMB JSON or null. */
export async function verifyPromoItem(
  customerCode: string, addressCode: string, entityCode: string,
): Promise<any | null> {
  if (!customerCode || customerCode === '0' || !entityCode) return null;
  try {
    const json = await ERP('verify_promo_item', {
      codiceInternoCliente: customerCode, codiceIndirizzo: addressCode, codiceInternoArticolo: entityCode,
    });
    return json?.status === 'success' ? json.data : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/test/unit/use-coupon.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-coupon.ts src/test/unit/use-coupon.test.tsx
git commit -m "feat(coupon): useCoupon hook (validate/persist/check) + verifyPromoItem"
```

---

## Task 10: `TimeCouponField` + display wiring in `TimeOrderSummary` (vinc-b2b)

Presentational input + the discount line in the checkout totals. UI wiring —
verify in the running app.

**Files:**
- Create: `src/components/themes/time/cart/time-coupon-field.tsx`
- Modify: `src/components/themes/time/cart/time-order-summary.tsx`

- [ ] **Step 1: Create the presentational field**

```tsx
// src/components/themes/time/cart/time-coupon-field.tsx
'use client';

import React, { useState } from 'react';

type Props = {
  status: 'idle' | 'loading' | 'valid' | 'invalid' | 'error';
  message: string;
  onApply: (code: string) => void;
  placeholder: string;
  applyLabel: string;
};

/** Coupon code input + Apply button. Stateless re: validity — parent owns useCoupon. */
export default function TimeCouponField({ status, message, onApply, placeholder, applyLabel }: Props) {
  const [code, setCode] = useState('');
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] px-3.5 py-2.5 text-[13px] text-[var(--time-dark)] bg-white outline-none transition-all focus:border-[var(--time-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]"
        />
        <button
          type="button"
          onClick={() => onApply(code)}
          disabled={status === 'loading' || !code}
          className="px-4 py-2.5 text-[13px] font-bold rounded-[var(--radius-btn)] bg-[var(--time-dark)] text-white disabled:opacity-50"
        >
          {applyLabel}
        </button>
      </div>
      {message && (
        <p className={status === 'valid' ? 'text-emerald-600 text-[12px]' : 'text-red-600 text-[12px]'}>
          {message}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire `useCoupon` + discount into `TimeOrderSummary`**

In `src/components/themes/time/cart/time-order-summary.tsx`:

Add imports near the other imports (top of file):

```tsx
import { useCoupon } from '@/hooks/use-coupon';
import { applyCouponDiscount } from '@/lib/coupon/discount';
import TimeCouponField from './time-coupon-field';
```

The file currently imports `import React, { useMemo, useState } from 'react';` — add
`useEffect` to that existing import (do **not** add a second `react` import line):

```tsx
import React, { useMemo, useState, useEffect } from 'react';
```

(`ERP_STATIC` is already imported in this file.)

Right after the totals are derived (the block at lines ~134-138, `const savings = gross - net;`), add:

```tsx
  const coupon = useCoupon({
    customerCode: String(ERP_STATIC.customer_code || ''),
    idCart: String(ERP_STATIC.id_cart || ''),
  });
  // Re-display a coupon already saved on the cart.
  useEffect(() => { coupon.checkCouponCart(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const discounted = applyCouponDiscount({ net, vat }, coupon.discountPercent);
```

In the **Totals** JSX block (around lines ~258-300), change the rows array values
from `net` / `vat` to the discounted values, and change the final `Totale` value
from `doc` to `discounted.doc`:

```tsx
          {[
            { label: 'Totale lordo', value: gross, strike: true },
            { label: 'Totale netto', value: discounted.net, bold: true },
            { label: 'IVA (22%)', value: discounted.vat },
          ].map((row) => (
```

```tsx
            <span className="text-[26px] font-black text-[var(--time-dark)] font-[var(--font-display)] tabular-nums">
              {money(discounted.doc)}
            </span>
```

Add a coupon discount row just after the existing `savings` row block (mirrors its styling):

```tsx
          {coupon.discountPercent > 0 && (
            <div className="flex justify-between items-center text-[12px] text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg mt-0.5">
              <span className="font-semibold">{t('coupon.discountLine', { defaultValue: 'Sconto coupon' })} −{coupon.discountPercent}%</span>
              <span className="font-bold">−{money(discounted.discount)}</span>
            </div>
          )}
```

Render the coupon field just above the Totals block (only when we have a customer + cart), inside the existing Fields/Notes section:

```tsx
          {String(ERP_STATIC.customer_code || '0') !== '0' && String(ERP_STATIC.id_cart || '0') !== '0' && (
            <TimeCouponField
              status={coupon.status}
              message={coupon.message}
              onApply={coupon.applyCoupon}
              placeholder={t('coupon.placeholder', { defaultValue: 'Codice coupon' })}
              applyLabel={t('coupon.apply', { defaultValue: 'Applica' })}
            />
          )}
```

- [ ] **Step 3: Type-check the touched files**

Run: `npx tsc --noEmit src/components/themes/time/cart/time-order-summary.tsx src/components/themes/time/cart/time-coupon-field.tsx`
Expected: no new errors. (If project-wide path-alias errors appear, prefer `pnpm check-types` and confirm the touched files are clean.)

- [ ] **Step 4: Manual verification (running app)**

With `pnpm dev` and `COUPON_API_URL` set in `.env`, as a logged-in B2B customer with an active cart, on `/<lang>/checkout`:
- Enter a known-valid coupon → **Applica** → netto/IVA/Totale drop by the % and a green "Sconto coupon" row appears.
- Enter an invalid coupon → red message, totals unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/themes/time/cart/time-coupon-field.tsx src/components/themes/time/cart/time-order-summary.tsx
git commit -m "feat(coupon): coupon field + discount line on the time checkout"
```

---

## Task 11: Persist the coupon at order submit (vinc-b2b)

**Files:**
- Modify: `src/components/themes/time/cart/time-order-summary.tsx`

- [ ] **Step 1: Persist before sending the order**

In `handleSubmit` (lines ~155-159), call `persistCoupon()` before `submitOrder` so
the backend has the coupon saved and reprices authoritatively:

```tsx
  const handleSubmit = async () => {
    if (!canSubmit) return;
    await coupon.persistCoupon(); // best-effort; no-op when no valid coupon applied
    await submitOrder(submitOpts);
    setShowConfirm(false);
  };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit src/components/themes/time/cart/time-order-summary.tsx`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Apply a valid coupon, then complete the order via the existing CTA. Confirm (network tab) a `POST /api/erp/submit_coupon` fires immediately before the order-submit call, and the persisted order reflects the discount on the backend.

- [ ] **Step 4: Commit**

```bash
git add src/components/themes/time/cart/time-order-summary.tsx
git commit -m "feat(coupon): persist coupon on order submit"
```

---

## Task 12: Per-article promo on the time product detail (vinc-b2b)

`verifyPromoItem` already exists (Task 9). This task renders it. Note: the time
product page already has promo UI driven by PIM/pricing (`time-promo-gated-cta.tsx`,
`TimeOfferRows`); this adds the MyMB `GetPromozioneBaseXArticolo` data as a
separate, additive block.

**Files:**
- Modify: `src/components/themes/time/product/time-product-detail.tsx`

- [ ] **Step 1: Fetch the promo on mount**

In `src/components/themes/time/product/time-product-detail.tsx`, add imports:

```tsx
import { verifyPromoItem } from '@/hooks/use-coupon';
import { ERP_STATIC } from '@framework/utils/static';
```

Near the other hooks (the component already uses `useEffect` and `data.id` as the
entity code — see existing `entityCode={String(data.id)}` usages), add:

```tsx
  const [basePromo, setBasePromo] = useState<any | null>(null);
  useEffect(() => {
    verifyPromoItem(
      String(ERP_STATIC.customer_code || ''),
      String(ERP_STATIC.address_code || ''),
      String(data.id || ''),
    ).then(setBasePromo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);
```

(`useState` is already imported in this file; confirm and add it to the import if not.)

- [ ] **Step 2: Render the promo block**

Render `basePromo` near the existing offer rows (the `#time-offer-rows` block,
around line ~560-568). Add, just after that block, gated on `basePromo`:

```tsx
          {basePromo && (
            <div className="mb-4 rounded-lg border border-[var(--time-gray-200)] bg-[var(--time-gray-50)] px-4 py-3 text-[13px] text-[var(--time-dark)]">
              {/* Shape depends on GetPromozioneBaseXArticolo; render the message/fields
                  the backend returns. Start by surfacing the raw result for QA, then
                  refine the markup once a real response is observed. */}
              <pre className="whitespace-pre-wrap text-[11px] text-[var(--time-gray-600)]">
                {JSON.stringify(basePromo, null, 2)}
              </pre>
            </div>
          )}
```

> The exact `GetPromozioneBaseXArticolo` response shape is not documented in the
> reference. Ship the raw render first, capture a real response in dev, then replace
> the `<pre>` with proper fields in a follow-up commit. Do **not** block the coupon
> flow on this.

- [ ] **Step 3: Type-check + manual verification**

Run: `npx tsc --noEmit src/components/themes/time/product/time-product-detail.tsx`
Expected: no new errors. Then, as a B2B customer, open a product detail page and confirm the promo block renders for an article that has a base promo (and is absent otherwise).

- [ ] **Step 4: Commit**

```bash
git add src/components/themes/time/product/time-product-detail.tsx
git commit -m "feat(coupon): per-article base promo on the time product detail"
```

---

## Task 13: i18n keys + env documentation (vinc-b2b)

`TimeOrderSummary` reads the `common` namespace (`useTranslation(lang, 'common')`).
Tasks 10/12 already use `t('coupon.*', { defaultValue })`, so English fallback works
even before keys exist; this task adds real keys to the primary locales and documents
the env.

**Files:**
- Modify: `src/app/i18n/locales/en/common.json`, `src/app/i18n/locales/it/common.json`
- Modify: `.env.example`

- [ ] **Step 1: Add keys to `en` and `it` `common.json`**

Add a `coupon` object to `src/app/i18n/locales/en/common.json`:

```json
"coupon": {
  "placeholder": "Coupon code",
  "apply": "Apply",
  "discountLine": "Coupon discount"
}
```

And to `src/app/i18n/locales/it/common.json`:

```json
"coupon": {
  "placeholder": "Codice coupon",
  "apply": "Applica",
  "discountLine": "Sconto coupon"
}
```

(Insert as a top-level key in each JSON object; mind trailing commas. Other locales
fall back to English via i18next `fallbackLng` — add them only if this project
requires every locale populated.)

- [ ] **Step 2: Document the env in `.env.example`**

Append to `.env.example`:

```bash
# Coupons (MyMB) — SEPARATE connection from the ERP. Full URL; credentials may be
# embedded (http://USER:PASS@host:8884/MyMB/Service/web) or supplied via
# COUPON_API_USER / COUPON_API_PASSWORD. The feature is active by default; leave
# COUPON_API_URL unset to disable (the coupon field hides itself).
# COUPON_API_URL=http://USER:PASS@mymb.baseprotection.com:8884/MyMB/Service/web
# COUPON_API_USER=
# COUPON_API_PASSWORD=
```

- [ ] **Step 3: Verify the JSON parses + run the touched unit tests**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/app/i18n/locales/en/common.json','utf8')); JSON.parse(require('fs').readFileSync('src/app/i18n/locales/it/common.json','utf8')); console.log('json ok')"`
Expected: prints `json ok`.

Run: `pnpm vitest run src/test/unit/coupon-discount.test.ts src/test/unit/use-coupon.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/i18n/locales/en/common.json src/app/i18n/locales/it/common.json .env.example
git commit -m "feat(coupon): i18n keys + env documentation"
```

---

## Final verification

- [ ] **Run the full coupon test set**

Run (vinc-erp): `cd vendor/vinc-erp && npm test`
Run (vinc-b2b): `pnpm vitest run src/test/unit/coupon-config.test.ts src/test/api/coupon-route.test.ts src/test/unit/coupon-discount.test.ts src/test/unit/use-coupon.test.tsx`
Expected: all PASS.

- [ ] **Type-check the touched files**

Run: `pnpm check-types`
Expected: no new errors (ignore pre-existing project-wide errors unrelated to these files).

- [ ] **End-to-end manual smoke (running app)**

With `COUPON_API_URL` set and `pnpm dev`, as a B2B customer with an active cart:
1. `/<lang>/checkout` → apply a valid coupon → netto/IVA/Totale drop + green "Sconto coupon" row.
2. Apply an invalid coupon → red message, totals unchanged.
3. Complete the order → `submit_coupon` fires just before the order-submit call.
4. Reload `/<lang>/checkout` with a coupon already saved → `checkCouponCart` re-displays the discount on mount.
5. Product detail → base-promo block renders for a promo article.
6. Unset `COUPON_API_URL` → coupon field hidden; checkout + product pages behave as before.

---

## Notes for phase 2 (separate change, not in this plan)

- Define the `coupon_settings` channel-scoped model in `vinc-commerce-suite` once the
  channel-scoped data-models feature ships (`relation: "channel"`, fields
  `enabled: checkbox`, `api_url: text`).
- Flip `resolveCouponConfig` in `src/lib/erp/coupon-config.ts` from
  `resolveCouponConfigFromEnv()` to a tenant CS-bits lookup (mirroring `factory.ts`
  `getTenantBits`: `csBaseUrl` / `apiKeyId` / `apiSecret`) + the active channel, then
  call `fetchCouponSettings`. No other code changes — every consumer already goes
  through `resolveCouponConfig`.
