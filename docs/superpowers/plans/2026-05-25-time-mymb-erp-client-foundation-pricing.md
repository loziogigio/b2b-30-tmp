# vinc-erp Package — Foundation + Pricing Vertical Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `vinc-erp` package (a server-side TypeScript port of `ErpClient.py`) and wire the time theme's product pricing to fetch from the MYMB ERP directly through it, end-to-end, with the default theme unchanged.

**Architecture:** A standalone framework-free package `packages/vinc-erp` (mirrors `packages/vinc-pim`) exposes a provider-agnostic `ErpClient` interface with `MyMbErpClient` as the first implementation. vinc-b2b adds `/api/erp/[...path]` internal routes that resolve a client via a factory (connection from `MYMB_ERP_URL`, behavior config from the Commerce Suite `erp_settings` data-model, Redis via an injected `CacheAdapter`) and a theme-keyed `erpApiBase()` switch so only the time theme uses the new path.

**Tech Stack:** TypeScript (NodeNext modules), Vitest, native `fetch`, Next.js App Router route handlers, Axios (existing `httpB2B`), ioredis (existing `redis-cache`).

**Spec:** `docs/superpowers/specs/2026-05-25-time-mymb-erp-client-package-design.md`

**Scope of THIS plan:** package scaffold + shared infra (`auth`, `request`, `CacheAdapter`, `endpoints`, `ErpError`) + the **pricing** path (`getMultiplePrices` + its `getSubstituteItems` fallback) + factory + data-model config + one route mapping + the frontend switch. Promos, account documents, and cart/ATP methods are **follow-on plans** that reuse this scaffolding.

---

## File Structure

**New package — `packages/vinc-erp/`:**
- `package.json`, `tsconfig.json`, `vitest.config.ts`, `README.md` — build/test config (mirrors vinc-pim)
- `src/index.ts` — barrel exports
- `src/erp-client.ts` — `ErpClient` interface (pricing slice) + `ErpError` + shared query types
- `src/cache.ts` — `CacheAdapter` interface + `NoopCacheAdapter`
- `src/endpoints.ts` — MYMB endpoint path constants
- `src/types/pricing.ts` — `MyMbPriceEntry`, `PriceQuery`, packaging/label types, `MyMbErpSettings`
- `src/mymb/auth.ts` — parse connection URL → `{ baseUrl, authHeader }`
- `src/mymb/transform.ts` — `getPackagingOptions`, `getLabelAndCartStatus`, `buildPriceEntry`
- `src/mymb/mymb-erp-client.ts` — `MyMbErpClient` (`request`, `getMultiplePrices`, `getSubstituteItems`)
- `src/__tests__/*.test.ts` — unit tests

**Modified/created in `vinc-b2b/`:**
- `src/lib/erp/redis-cache-adapter.ts` — `CacheAdapter` over `cachedJson` (Create)
- `src/lib/erp/data-model-config.ts` — fetch `erp_settings` → `MyMbErpSettings` (Create)
- `src/lib/erp/factory.ts` — `getMyMbErpClient(req)` (Create)
- `src/app/api/erp/[...path]/route.ts` — route dispatch (Create)
- `src/framework/basic-rest/utils/erp-api-base.ts` — `erpApiBase(theme)` resolver (Create)
- `src/framework/basic-rest/erp/prices.tsx` — use `erpApiBase()` (Modify)
- `package.json` — add `"vinc-erp": "^1.0.0"` (Modify)

---

## Task 1: Scaffold the `vinc-erp` package

**Files:**
- Create: `packages/vinc-erp/package.json`
- Create: `packages/vinc-erp/tsconfig.json`
- Create: `packages/vinc-erp/vitest.config.ts`
- Create: `packages/vinc-erp/README.md`
- Create: `packages/vinc-erp/src/index.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "vinc-erp",
  "version": "1.0.0",
  "description": "Shared ERP client and types for VINC applications (provider-agnostic ErpClient + MyMbErpClient)",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "pnpm build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "keywords": ["erp", "mymb", "api-client", "vinc"],
  "author": "VINC",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`** (identical compiler options to vinc-pim)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/__tests__"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create `README.md`**

```markdown
# vinc-erp

Server-side, framework-free ERP client for VINC applications.

- `ErpClient` — provider-agnostic interface. The contract every ERP integration implements.
- `MyMbErpClient` — first implementation; talks to the MYMB ERP webservice over HTTP with Basic auth. A faithful TypeScript port of the legacy `ErpClient.py`.

Caching and configuration are **injected** (see `CacheAdapter` and `MyMbErpSettings`) so the package has zero runtime dependencies and never reaches the browser.

## Adding a new ERP provider

1. Add canonical DTOs to `src/types/` if the provider needs new shapes.
2. Create `src/<provider>/<provider>-erp-client.ts` implementing `ErpClient`.
3. Export it from `src/index.ts`.
Consumers select an implementation; routes and DTOs stay unchanged.
```

- [ ] **Step 5: Create a placeholder barrel `src/index.ts`** (filled in later tasks)

```ts
export {};
```

- [ ] **Step 6: Install dev deps and verify the build runs**

Run: `cd packages/vinc-erp && pnpm install && pnpm build`
Expected: install succeeds; `pnpm build` exits 0 and creates `dist/index.js` + `dist/index.d.ts`.

- [ ] **Step 7: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app
git add packages/vinc-erp
git commit -m "chore(vinc-erp): scaffold package (mirrors vinc-pim)"
```

---

## Task 2: Connection URL parser (`mymb/auth.ts`)

Parses a single URL with embedded credentials (`http://user:pass@host:port/base`) into a base URL (no userinfo) and an HTTP Basic `Authorization` header.

**Files:**
- Create: `packages/vinc-erp/src/mymb/auth.ts`
- Test: `packages/vinc-erp/src/__tests__/auth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseMyMbConnection } from '../mymb/auth.js';

describe('parseMyMbConnection', () => {
  it('splits embedded credentials into base URL + Basic auth header', () => {
    const c = parseMyMbConnection('http://USER1:PASS1@10.0.0.5:8896/MyMB/Service/web');
    expect(c.baseUrl).toBe('http://10.0.0.5:8896/MyMB/Service/web');
    expect(c.authHeader).toBe(`Basic ${Buffer.from('USER1:PASS1').toString('base64')}`);
  });

  it('strips a trailing slash from the base URL', () => {
    const c = parseMyMbConnection('http://u:p@h:1/MyMB/web/');
    expect(c.baseUrl).toBe('http://u:p@h:1/MyMB/web'.replace('u:p@', ''));
  });

  it('throws when credentials are missing', () => {
    expect(() => parseMyMbConnection('http://h:1/MyMB/web')).toThrow(/credentials/i);
  });

  it('throws on an unparseable URL', () => {
    expect(() => parseMyMbConnection('not a url')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/vinc-erp && pnpm test -- auth`
Expected: FAIL — cannot resolve `../mymb/auth.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface MyMbConnection {
  /** Base URL with NO userinfo and NO trailing slash. */
  baseUrl: string;
  /** `Basic base64(user:pass)` */
  authHeader: string;
}

/**
 * Parse a MYMB connection string of the form
 * `http://user:pass@host:port/base/path` into a base URL (credentials
 * stripped) plus an HTTP Basic auth header built from the embedded userinfo.
 */
export function parseMyMbConnection(connectionUrl: string): MyMbConnection {
  const u = new URL(connectionUrl); // throws on garbage
  const user = decodeURIComponent(u.username);
  const pass = decodeURIComponent(u.password);
  if (!user || !pass) {
    throw new Error('MYMB connection URL is missing credentials (user:pass@)');
  }
  u.username = '';
  u.password = '';
  // u.toString() keeps a trailing slash for root; strip any trailing slash.
  const baseUrl = u.toString().replace(/\/+$/, '');
  const authHeader = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  return { baseUrl, authHeader };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/vinc-erp && pnpm test -- auth`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app
git add packages/vinc-erp/src/mymb/auth.ts packages/vinc-erp/src/__tests__/auth.test.ts
git commit -m "feat(vinc-erp): MYMB connection URL parser (base URL + Basic auth)"
```

---

## Task 3: Endpoint constants + `ErpError` + shared types

**Files:**
- Create: `packages/vinc-erp/src/endpoints.ts`
- Create: `packages/vinc-erp/src/types/pricing.ts`
- Create: `packages/vinc-erp/src/erp-client.ts`
- Test: `packages/vinc-erp/src/__tests__/erp-client.test.ts`

- [ ] **Step 1: Create `src/endpoints.ts`**

```ts
/** Raw MYMB ERP webservice endpoints (PascalCase, appended to the base URL). */
export const MYMB_ENDPOINTS = {
  GET_PREZZATURA_MULTIPLA: 'GetPrezzaturaMultipla',
  GET_LISTA_ARTICOLI_ALTERNATIVI: 'GetListaArticoliAlternativi',
} as const;

export type MyMbEndpoint =
  (typeof MYMB_ENDPOINTS)[keyof typeof MYMB_ENDPOINTS];
```

- [ ] **Step 2: Create `src/types/pricing.ts`**

These mirror the Python `product_data_dict` output shape exactly (so the existing vinc-b2b `transformErpPricesResponse` consumes them unchanged). Fields not computed by the Python are intentionally absent.

```ts
/** Behavior config, sourced per-tenant (injected; never read from env here). */
export interface MyMbErpSettings {
  /** Ordered packaging IDs used to build the legacy `packaging_options` list. */
  packagingOptionsId: number[];
  isManagedSubstitutes: boolean;
  isManagedSupplierOrder: boolean;
  /** Keyed "0".."5" → label + add-to-cart flag. */
  cases: Record<string, { label: string; addToCart: boolean }>;
  updatePromoSeconds: number;
  updateAvailableAgainSeconds: number;
}

export interface PriceQuery {
  customerCode: string;
  addressCode: string;
  entityCodes: string[];
  quantityList?: number[];
  idCart?: string;
  /** DDMMYYYY; defaults to today. */
  pricingDate?: string;
  loadPackingList?: boolean;
  calculateAvailability?: boolean;
  calculateArrivals?: boolean;
  calculatePreviousOrders?: boolean;
}

export interface NormalizedPackagingOption {
  packaging_uom_description: unknown;
  packaging_code: unknown;
  packaging_is_default: unknown;
  packaging_is_smallest: unknown;
  qty_x_packaging: unknown;
  packaging_uom: unknown;
}

export interface ProductLabelAction {
  LABEL: string;
  ADD_TO_CART: boolean;
  substitute_available: unknown[] | null;
  order_supplier_available: unknown[] | null;
  quantity_available: number;
  is_managed_substitutes: boolean;
  is_managed_supplier_order: boolean;
  case: number | null;
  prod_substitution?: string[];
}

/**
 * One entry of the map returned by `getMultiplePrices`, keyed by entity code.
 * Shape matches the legacy Python `product_data_dict[code]` exactly: computed
 * snake_case fields PLUS raw MYMB passthrough (`improving_promo`, `all_promo`).
 */
export interface MyMbPriceEntry {
  entity_code: string;
  vat_percent: unknown;
  availability: unknown;
  all_promo: unknown;        // raw RighePromo ({ ListaPromo: [...] }) or {}
  improving_promo: unknown;  // raw RigaPromozioneMigliorativa or {}
  net_price: unknown;
  gross_price: unknown;
  count_promo: number;
  is_improving_promo_net_price: boolean;
  buy_did: unknown;
  buy_did_amount: unknown;
  buy_did_last_date: unknown;
  promo: unknown;
  promozionale: unknown;
  num_promo: unknown;
  num_promo_canvas: unknown;
  price?: unknown;
  price_discount?: unknown;
  promo_price?: unknown;
  promo_code?: unknown;
  promo_row?: unknown;
  is_improving_promo?: boolean;
  is_promo?: boolean;
  promo_title?: unknown;
  start_promo_date?: string;
  end_promo_date?: string;
  discount_extra?: unknown[];
  discount: unknown[];
  pricelist_type: unknown;
  pricelist_code: unknown;
  packaging_option_smallest?: NormalizedPackagingOption;
  packaging_option_default?: NormalizedPackagingOption;
  packaging_options_all: NormalizedPackagingOption[];
  packaging_options: unknown[];
  order_suplier_available: unknown[];
  prod_substitution: string[];
  product_label_action: ProductLabelAction;
}
```

- [ ] **Step 3: Write the failing test for `erp-client.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ErpError } from '../erp-client.js';

describe('ErpError', () => {
  it('carries endpoint, status, returnCode and message', () => {
    const e = new ErpError('boom', { endpoint: 'GetX', status: 502, returnCode: 3 });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ErpError');
    expect(e.message).toBe('boom');
    expect(e.endpoint).toBe('GetX');
    expect(e.status).toBe(502);
    expect(e.returnCode).toBe(3);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd packages/vinc-erp && pnpm test -- erp-client`
Expected: FAIL — cannot resolve `../erp-client.js`.

- [ ] **Step 5: Create `src/erp-client.ts`** (interface scoped to the pricing slice; later plans extend it)

```ts
import type { MyMbPriceEntry, PriceQuery } from './types/pricing.js';

export interface ErpErrorDetail {
  endpoint?: string;
  status?: number;
  returnCode?: number;
}

/** Typed error for any ERP request failure. */
export class ErpError extends Error {
  readonly endpoint?: string;
  readonly status?: number;
  readonly returnCode?: number;
  constructor(message: string, detail: ErpErrorDetail = {}) {
    super(message);
    this.name = 'ErpError';
    this.endpoint = detail.endpoint;
    this.status = detail.status;
    this.returnCode = detail.returnCode;
  }
}

/**
 * Provider-agnostic ERP contract. Method set grows per follow-on plan.
 * Pricing slice only, for now.
 */
export interface ErpClient {
  getMultiplePrices(input: PriceQuery): Promise<Record<string, MyMbPriceEntry>>;
  /** Internal codes of substitute articles for an item (GetListaArticoliAlternativi). */
  getSubstituteItems(
    entityCode: string,
    idCart?: number,
    pricingDate?: string,
  ): Promise<string[]>;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/vinc-erp && pnpm test -- erp-client`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app
git add packages/vinc-erp/src/endpoints.ts packages/vinc-erp/src/types/pricing.ts packages/vinc-erp/src/erp-client.ts packages/vinc-erp/src/__tests__/erp-client.test.ts
git commit -m "feat(vinc-erp): endpoints, pricing types, ErpClient interface + ErpError"
```

---

## Task 4: `CacheAdapter` interface + `NoopCacheAdapter`

The package never imports Redis. It declares a tiny adapter; vinc-b2b implements it (Task 9). The pricing slice does not cache, but the client constructor accepts an adapter so later plans (promos) use it without a constructor change.

**Files:**
- Create: `packages/vinc-erp/src/cache.ts`
- Test: `packages/vinc-erp/src/__tests__/cache.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { NoopCacheAdapter } from '../cache.js';

describe('NoopCacheAdapter', () => {
  it('always calls the producer and returns its value', async () => {
    const cache = new NoopCacheAdapter();
    let calls = 0;
    const producer = async () => { calls++; return 42; };
    expect(await cache.getOrProduce('k', 60, producer)).toBe(42);
    expect(await cache.getOrProduce('k', 60, producer)).toBe(42);
    expect(calls).toBe(2); // no caching
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/vinc-erp && pnpm test -- cache`
Expected: FAIL — cannot resolve `../cache.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * Read-through cache contract. `getOrProduce` returns a cached value if fresh
 * within `ttlSeconds`, otherwise runs `producer`, stores, and returns it.
 * Implementations may serve stale on producer error.
 */
export interface CacheAdapter {
  getOrProduce<T>(
    key: string,
    ttlSeconds: number,
    producer: () => Promise<T>,
  ): Promise<T>;
}

/** No-op adapter: always runs the producer. Default + test double. */
export class NoopCacheAdapter implements CacheAdapter {
  async getOrProduce<T>(
    _key: string,
    _ttlSeconds: number,
    producer: () => Promise<T>,
  ): Promise<T> {
    return producer();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/vinc-erp && pnpm test -- cache`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app
git add packages/vinc-erp/src/cache.ts packages/vinc-erp/src/__tests__/cache.test.ts
git commit -m "feat(vinc-erp): CacheAdapter interface + NoopCacheAdapter"
```

---

## Task 5: `getPackagingOptions` transform helper

Port of the Python `get_packaging_options`: filter the article's packaging list to the configured IDs, in configured order, enriching each with `id`/`label`/`amount`.

**Files:**
- Create: `packages/vinc-erp/src/mymb/transform.ts`
- Test: `packages/vinc-erp/src/__tests__/transform-packaging.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { getPackagingOptions } from '../mymb/transform.js';

describe('getPackagingOptions', () => {
  const list = [
    { IdImballo: 1, CodiceImballo1: 'PZ', QtaXImballo: 1 },
    { IdImballo: 2, CodiceImballo1: 'BOX', QtaXImballo: 6 },
    { IdImballo: 3, CodiceImballo1: 'PAL', QtaXImballo: 48 },
  ];

  it('keeps only configured IDs, in configured order, with id/label/amount', () => {
    const out = getPackagingOptions(list, [3, 1]);
    expect(out.map((o) => o.IdImballo)).toEqual([3, 1]);
    expect(out[0]).toMatchObject({ id: 3, label: 'PAL', amount: 48 });
    expect(out[1]).toMatchObject({ id: 1, label: 'PZ', amount: 1 });
  });

  it('returns [] when no configured IDs match', () => {
    expect(getPackagingOptions(list, [99])).toEqual([]);
  });

  it('returns [] for empty/missing inputs', () => {
    expect(getPackagingOptions([], [1])).toEqual([]);
    expect(getPackagingOptions(undefined, [1])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/vinc-erp && pnpm test -- transform-packaging`
Expected: FAIL — cannot resolve `../mymb/transform.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
type RawPackaging = Record<string, unknown> & { IdImballo?: number };

/**
 * Port of Python `get_packaging_options`. Returns the packaging rows whose
 * `IdImballo` is in `orderIds`, ordered to match `orderIds`, each copied and
 * enriched with `id`/`label`/`amount`.
 */
export function getPackagingOptions(
  list: RawPackaging[] | undefined,
  orderIds: number[],
): Array<RawPackaging & { id: number; label: unknown; amount: unknown }> {
  if (!Array.isArray(list) || list.length === 0) return [];
  const out: Array<RawPackaging & { id: number; label: unknown; amount: unknown }> = [];
  for (const id of orderIds) {
    const item = list.find((it) => it.IdImballo === id);
    if (item) {
      out.push({
        ...item,
        id: item.IdImballo as number,
        label: item.CodiceImballo1,
        amount: item.QtaXImballo,
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/vinc-erp && pnpm test -- transform-packaging`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app
git add packages/vinc-erp/src/mymb/transform.ts packages/vinc-erp/src/__tests__/transform-packaging.test.ts
git commit -m "feat(vinc-erp): getPackagingOptions transform (port of Python helper)"
```

---

## Task 6: `getLabelAndCartStatus` transform helper

Port of Python `get_label_and_cart_status`: pick a case (0–5) from availability + managed flags + supplied data, then look up label/add-to-cart from `cases`. Config is passed in (not `os.getenv`).

**Files:**
- Modify: `packages/vinc-erp/src/mymb/transform.ts`
- Test: `packages/vinc-erp/src/__tests__/transform-label.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { getLabelAndCartStatus } from '../mymb/transform.js';

const cases = {
  '0': { label: 'Available', addToCart: true },
  '1': { label: 'Sub+Arrival', addToCart: true },
  '4': { label: 'Unavailable', addToCart: false },
  '5': { label: 'Unmanaged', addToCart: false },
};

describe('getLabelAndCartStatus', () => {
  it('case 0 when quantity available', () => {
    const r = getLabelAndCartStatus(5, [], [], {
      isManagedSubstitutes: true, isManagedSupplierOrder: true, cases,
    });
    expect(r.case).toBe(0);
    expect(r.LABEL).toBe('Available');
    expect(r.ADD_TO_CART).toBe(true);
    expect(r.quantity_available).toBe(5);
  });

  it('case 1: no stock, managed subs+supplier, both present', () => {
    const r = getLabelAndCartStatus(0, [{ x: 1 }], [{ y: 1 }], {
      isManagedSubstitutes: true, isManagedSupplierOrder: true, cases,
    });
    expect(r.case).toBe(1);
    expect(r.LABEL).toBe('Sub+Arrival');
  });

  it('case 5: no stock, nothing managed', () => {
    const r = getLabelAndCartStatus(0, [], [], {
      isManagedSubstitutes: false, isManagedSupplierOrder: false, cases,
    });
    expect(r.case).toBe(5);
    expect(r.ADD_TO_CART).toBe(false);
  });

  it('UNKNOWN fallback when matched case has no config entry', () => {
    const r = getLabelAndCartStatus(0, [], [{ y: 1 }], {
      isManagedSubstitutes: true, isManagedSupplierOrder: true, cases,
    }); // → case 3, not in `cases`
    expect(r.case).toBe(3);
    expect(r.LABEL).toBe('UNKNOWN');
    expect(r.ADD_TO_CART).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/vinc-erp && pnpm test -- transform-label`
Expected: FAIL — `getLabelAndCartStatus` is not exported.

- [ ] **Step 3: Add the implementation to `src/mymb/transform.ts`**

```ts
import type { ProductLabelAction } from '../types/pricing.js';

interface LabelConfig {
  isManagedSubstitutes: boolean;
  isManagedSupplierOrder: boolean;
  cases: Record<string, { label: string; addToCart: boolean }>;
}

/**
 * Port of Python `get_label_and_cart_status`. Determines the availability
 * "case" (0..5) and resolves label / add-to-cart from `config.cases`.
 */
export function getLabelAndCartStatus(
  quantityAvailable: number,
  substituteAvailable: unknown[],
  orderSupplierAvailable: unknown[],
  config: LabelConfig,
): ProductLabelAction {
  const subs = config.isManagedSubstitutes;
  const supplier = config.isManagedSupplierOrder;
  const hasSub = Array.isArray(substituteAvailable) && substituteAvailable.length > 0;
  const hasArr = Array.isArray(orderSupplierAvailable) && orderSupplierAvailable.length > 0;

  let c: number | null = null;
  if (quantityAvailable > 0) {
    c = 0;
  } else if (subs && hasSub && supplier && hasArr) {
    c = 1;
  } else if (subs && hasSub && supplier && !hasArr) {
    c = 2;
  } else if (subs && !hasSub && supplier && hasArr) {
    c = 3;
  } else if (subs && !hasSub && supplier && !hasArr) {
    c = 4;
  } else if (!subs && !supplier) {
    c = 5;
  }

  const entry =
    c !== null ? config.cases[String(c)] : undefined;

  return {
    LABEL: entry?.label ?? 'UNKNOWN',
    ADD_TO_CART: entry?.addToCart ?? false,
    substitute_available: hasSub ? substituteAvailable : null,
    order_supplier_available: hasArr ? orderSupplierAvailable : null,
    quantity_available: quantityAvailable,
    is_managed_substitutes: subs,
    is_managed_supplier_order: supplier,
    case: c,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/vinc-erp && pnpm test -- transform-label`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app
git add packages/vinc-erp/src/mymb/transform.ts packages/vinc-erp/src/__tests__/transform-label.test.ts
git commit -m "feat(vinc-erp): getLabelAndCartStatus transform (port of Python helper)"
```

---

## Task 7: `buildPriceEntry` transform

Port of the per-`price` body of Python `get_multiple_prices`: maps one MYMB `ListaPrezzatura` row to a `MyMbPriceEntry`. The substitute fallback (which needs a network call) stays in the client (Task 8); `buildPriceEntry` is pure.

**Files:**
- Modify: `packages/vinc-erp/src/mymb/transform.ts`
- Test: `packages/vinc-erp/src/__tests__/transform-price-entry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildPriceEntry } from '../mymb/transform.js';
import type { MyMbErpSettings } from '../types/pricing.js';

const settings: MyMbErpSettings = {
  packagingOptionsId: [1],
  isManagedSubstitutes: false,
  isManagedSupplierOrder: false,
  cases: { '0': { label: 'OK', addToCart: true }, '5': { label: 'NO', addToCart: false } },
  updatePromoSeconds: 21600,
  updateAvailableAgainSeconds: 21600,
};

function rawPrice(overrides: Record<string, unknown> = {}) {
  return {
    CodiceInternoArticolo: 'ART1',
    IVAPercentuale: 22,
    QtaDisponibile: 10,
    Prezzo: 100,
    PrezzoNettoXVisualizzazione: 90,
    TipoListinoUtilizzato: 'L1',
    CodiceListinoUtilizzato: 'C1',
    ImballiArticolo: { ListaImballoXArticolo: [
      { IdImballo: 1, CodiceImballo1: 'PZ', QtaXImballo: 1, UM: 'PZ', DescrizioneUM: 'Pezzo',
        IsImballoDiDefaultXVendita: true, IsImballoPiuPiccolo: true },
    ]},
    ...overrides,
  };
}

describe('buildPriceEntry', () => {
  it('maps base (no improving promo) fields like the Python listino branch', () => {
    const e = buildPriceEntry(rawPrice(), settings);
    expect(e.entity_code).toBe('ART1');
    expect(e.vat_percent).toBe(22);
    expect(e.availability).toBe(10);
    expect(e.gross_price).toBe(100);
    expect(e.net_price).toBe(90);
    expect(e.price).toBe(100);
    expect(e.price_discount).toBe(90);
    expect(e.is_promo).toBe(false);
    expect(e.is_improving_promo).toBe(false);
    expect(e.pricelist_type).toBe('L1');
    expect(e.pricelist_code).toBe('C1');
    expect(e.packaging_option_default).toMatchObject({ packaging_code: 'PZ' });
    expect(e.packaging_option_smallest).toMatchObject({ packaging_code: 'PZ' });
    expect(e.packaging_options.length).toBe(1); // configured id 1 present
    expect(e.product_label_action.case).toBe(0);
    expect(e.improving_promo).toEqual({}); // raw passthrough default
  });

  it('applies the improving-promo branch when RigaPromozioneMigliorativa has a code', () => {
    const e = buildPriceEntry(rawPrice({
      RigaPromozioneMigliorativa: {
        CodicePromozione: 'P1',
        TipoPromozione: 'RigaPrezzoNettoQuantitaMinima',
        PrezzoNettoListinoDiRiferimento: 80,
        PrezzoNettoConPromo: 70,
        RigaPromozione: 2,
        TitoloPromozione: 'Deal',
        DataInizioValitita: '01/15/2026 12:00:00 AM',
        DataFineValidita: '02/15/2026 12:00:00 AM',
        ScontoExtra1: 5, ScontoExtra2: 0, ScontoExtra3: 0,
      },
    }), settings);
    expect(e.is_promo).toBe(true);
    expect(e.is_improving_promo).toBe(true);
    expect(e.is_improving_promo_net_price).toBe(true);
    expect(e.price).toBe(80);
    expect(e.price_discount).toBe(70);
    expect(e.promo_price).toBe(70);
    expect(e.promo_code).toBe('P1');
    expect(e.start_promo_date).toBe('15/01/26');
    expect(e.end_promo_date).toBe('15/02/26');
    expect(e.discount_extra).toEqual([5, 0, 0]);
  });

  it('passes through raw RighePromo as all_promo and counts it', () => {
    const e = buildPriceEntry(rawPrice({ RighePromo: { ListaPromo: [{ a: 1 }, { b: 2 }] } }), settings);
    expect(e.all_promo).toEqual({ ListaPromo: [{ a: 1 }, { b: 2 }] });
    expect(e.count_promo).toBe(0); // count_promo only counts when all_promo is itself a list (Python parity)
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/vinc-erp && pnpm test -- transform-price-entry`
Expected: FAIL — `buildPriceEntry` is not exported.

- [ ] **Step 3: Add the implementation to `src/mymb/transform.ts`**

Notes on fidelity to the Python:
- `all_promo = price.RighePromo ?? {}` (raw passthrough; `count_promo` is `length` only when it is an array — matches the Python `isinstance(list)` guard).
- `improving_promo = price.RigaPromozioneMigliorativa ?? {}` (raw passthrough).
- Date format: Python parses `"%m/%d/%Y %H:%M:%S %p"` then formats `"%d/%m/%y"`.

```ts
import type {
  MyMbErpSettings,
  MyMbPriceEntry,
  NormalizedPackagingOption,
} from '../types/pricing.js';

function mapPackaging(p: Record<string, unknown>): NormalizedPackagingOption {
  return {
    packaging_uom_description: p.DescrizioneUM,
    packaging_code: p.CodiceImballo1,
    packaging_is_default: p.IsImballoDiDefaultXVendita,
    packaging_is_smallest: p.IsImballoPiuPiccolo,
    qty_x_packaging: p.QtaXImballo,
    packaging_uom: p.UM,
  };
}

/** Python `datetime.strptime(s, "%m/%d/%Y %H:%M:%S %p").strftime("%d/%m/%y")`. */
function formatPromoValidity(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const datePart = raw.split(' ')[0]; // MM/DD/YYYY
  const [mm, dd, yyyy] = datePart.split('/');
  if (!mm || !dd || !yyyy) return '';
  return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy.slice(-2)}`;
}

/**
 * Port of the per-row body of Python `get_multiple_prices`. Pure: the
 * substitute-fallback network call is applied by the client afterwards.
 */
export function buildPriceEntry(
  price: Record<string, any>,
  settings: MyMbErpSettings,
): MyMbPriceEntry {
  const packagingList: Record<string, unknown>[] =
    price?.ImballiArticolo?.ListaImballoXArticolo ?? [];

  const packagingAll = packagingList.map(mapPackaging);
  let smallest: NormalizedPackagingOption | undefined;
  let dflt: NormalizedPackagingOption | undefined;
  for (const p of packagingList) {
    const opt = mapPackaging(p);
    if (p.IsImballoPiuPiccolo) smallest = opt;
    if (p.IsImballoDiDefaultXVendita) dflt = opt;
  }

  const allPromo = price.RighePromo ?? {};
  const improving = price.RigaPromozioneMigliorativa ?? {};
  const arrivi = price.ArriviPerArticolo ?? {};
  const supplierArrivals: unknown[] = arrivi?.ListaArrivi ?? [];

  const entry: MyMbPriceEntry = {
    entity_code: price.CodiceInternoArticolo,
    vat_percent: price.IVAPercentuale,
    availability: price.QtaDisponibile,
    all_promo: allPromo,
    improving_promo: improving,
    net_price: price.PrezzoNettoXVisualizzazione,
    gross_price: price.Prezzo,
    count_promo: Array.isArray(allPromo) ? allPromo.length : 0,
    is_improving_promo_net_price: false,
    buy_did: price.IsArticoloOrdinatoInPrecedenza ?? '',
    buy_did_amount: price.QtaUltimoOrdine ?? '',
    buy_did_last_date: price.DataUltimoOrdine ?? '',
    promo: price.IsArticoloPromozionabile ?? false,
    promozionale: price.IsListinoPromozionale ?? false,
    num_promo: price.NrPromozioniPotenzialmenteApplicabili ?? 0,
    num_promo_canvas: price.NumeroPromozioniCanvas ?? 0,
    discount: [
      price.ScontoORicarica1, price.ScontoORicarica2, price.ScontoORicarica3,
      price.ScontoORicarica4, price.ScontoORicarica5, price.ScontoORicarica6,
    ],
    pricelist_type: price.TipoListinoUtilizzato,
    pricelist_code: price.CodiceListinoUtilizzato,
    packaging_option_smallest: smallest,
    packaging_option_default: dflt,
    packaging_options_all: packagingAll,
    packaging_options: getPackagingOptions(packagingList, settings.packagingOptionsId),
    order_suplier_available: supplierArrivals,
    prod_substitution: [],
    product_label_action: getLabelAndCartStatus(
      Number(price.QtaDisponibile ?? 0),
      [],
      supplierArrivals,
      settings,
    ),
  };

  const hasImproving =
    improving && typeof improving === 'object' && (improving as any).CodicePromozione != null;

  if (hasImproving) {
    const imp = improving as Record<string, any>;
    entry.is_improving_promo_net_price = imp.TipoPromozione === 'RigaPrezzoNettoQuantitaMinima';
    entry.price = imp.PrezzoNettoListinoDiRiferimento;
    entry.price_discount = imp.PrezzoNettoConPromo;
    entry.promo_price = imp.PrezzoNettoConPromo;
    entry.promo_code = imp.CodicePromozione;
    entry.promo_row = imp.RigaPromozione;
    entry.is_improving_promo = true;
    entry.is_promo = true;
    entry.promo_title = imp.TitoloPromozione;
    entry.start_promo_date = formatPromoValidity(imp.DataInizioValitita);
    entry.end_promo_date = formatPromoValidity(imp.DataFineValidita);
    entry.discount_extra = [imp.ScontoExtra1, imp.ScontoExtra2, imp.ScontoExtra3];
  } else {
    entry.price = price.Prezzo;
    entry.price_discount = price.PrezzoNettoXVisualizzazione;
    entry.is_improving_promo = false;
    entry.is_promo = false;
  }

  return entry;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/vinc-erp && pnpm test -- transform-price-entry`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app
git add packages/vinc-erp/src/mymb/transform.ts packages/vinc-erp/src/__tests__/transform-price-entry.test.ts
git commit -m "feat(vinc-erp): buildPriceEntry transform (port of get_multiple_prices row mapping)"
```

---

## Task 8: `MyMbErpClient` (`request`, `getSubstituteItems`, `getMultiplePrices`)

**Files:**
- Create: `packages/vinc-erp/src/mymb/mymb-erp-client.ts`
- Test: `packages/vinc-erp/src/__tests__/mymb-erp-client.test.ts`

- [ ] **Step 1: Write the failing test** (uses an injected `fetch` so no network)

```ts
import { describe, it, expect, vi } from 'vitest';
import { MyMbErpClient } from '../mymb/mymb-erp-client.js';
import { NoopCacheAdapter } from '../cache.js';
import { ErpError } from '../erp-client.js';
import type { MyMbErpSettings } from '../types/pricing.js';

const settings: MyMbErpSettings = {
  packagingOptionsId: [1],
  isManagedSubstitutes: false,
  isManagedSupplierOrder: false,
  cases: { '0': { label: 'OK', addToCart: true } },
  updatePromoSeconds: 21600,
  updateAvailableAgainSeconds: 21600,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  });
}

function makeClient(fetchImpl: typeof fetch) {
  return new MyMbErpClient({
    baseUrl: 'http://erp:8896/MyMB/web',
    authHeader: 'Basic xyz',
    settings,
    cache: new NoopCacheAdapter(),
    fetchImpl,
  });
}

describe('MyMbErpClient.getMultiplePrices', () => {
  it('returns {} for empty entityCodes without calling fetch', async () => {
    const f = vi.fn();
    const client = makeClient(f as unknown as typeof fetch);
    expect(await client.getMultiplePrices({ customerCode: 'C', addressCode: 'A', entityCodes: [] })).toEqual({});
    expect(f).not.toHaveBeenCalled();
  });

  it('maps GetPrezzaturaMultipla rows into an entity-keyed map', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({
      GetPrezzaturaMultiplaResult: {
        ReturnCode: 0,
        ListaPrezzatura: [
          { CodiceInternoArticolo: 'ART1', IVAPercentuale: 22, QtaDisponibile: 5,
            Prezzo: 100, PrezzoNettoXVisualizzazione: 90,
            TipoListinoUtilizzato: 'L', CodiceListinoUtilizzato: 'C',
            ImballiArticolo: { ListaImballoXArticolo: [] } },
        ],
      },
    }));
    const client = makeClient(f as unknown as typeof fetch);
    const out = await client.getMultiplePrices({
      customerCode: 'C', addressCode: 'A', entityCodes: ['ART1'], quantityList: [1],
    });
    expect(Object.keys(out)).toEqual(['ART1']);
    expect(out.ART1.net_price).toBe(90);
    expect(f).toHaveBeenCalledOnce();
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain('/GetPrezzaturaMultipla');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as any).headers.Authorization).toBe('Basic xyz');
  });

  it('throws ErpError when ReturnCode != 0', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({
      GetPrezzaturaMultiplaResult: { ReturnCode: 3, Message: 'bad' },
    }));
    const client = makeClient(f as unknown as typeof fetch);
    await expect(client.getMultiplePrices({
      customerCode: 'C', addressCode: 'A', entityCodes: ['ART1'],
    })).rejects.toBeInstanceOf(ErpError);
  });

  it('throws ErpError on a non-2xx HTTP status', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    const client = makeClient(f as unknown as typeof fetch);
    await expect(client.getMultiplePrices({
      customerCode: 'C', addressCode: 'A', entityCodes: ['ART1'],
    })).rejects.toBeInstanceOf(ErpError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/vinc-erp && pnpm test -- mymb-erp-client`
Expected: FAIL — cannot resolve `../mymb/mymb-erp-client.js`.

- [ ] **Step 3: Write the implementation**

```ts
import type { CacheAdapter } from '../cache.js';
import { NoopCacheAdapter } from '../cache.js';
import type { ErpClient } from '../erp-client.js';
import { ErpError } from '../erp-client.js';
import { MYMB_ENDPOINTS } from '../endpoints.js';
import type { MyMbErpSettings, MyMbPriceEntry, PriceQuery } from '../types/pricing.js';
import { buildPriceEntry } from './transform.js';

export interface MyMbErpClientConfig {
  /** Base URL, no userinfo, no trailing slash (from parseMyMbConnection). */
  baseUrl: string;
  /** `Basic ...` header value (from parseMyMbConnection). */
  authHeader: string;
  settings: MyMbErpSettings;
  cache?: CacheAdapter;
  /** Inject for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

function ddmmyyyy(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}${p(d.getMonth() + 1)}${d.getFullYear()}`;
}

export class MyMbErpClient implements ErpClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly settings: MyMbErpSettings;
  private readonly cache: CacheAdapter;
  private readonly fetchImpl: typeof fetch;

  constructor(config: MyMbErpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.authHeader = config.authHeader;
    this.settings = config.settings;
    this.cache = config.cache ?? new NoopCacheAdapter();
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  /** Mirrors Python ErpClient.request: Basic auth, ReturnCode handling, errors. */
  private async request<T = any>(
    endpoint: string,
    opts: { method?: 'GET' | 'POST'; params?: Record<string, unknown>; body?: unknown } = {},
  ): Promise<T> {
    const method = opts.method ?? 'POST';
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    if (opts.params) {
      for (const [k, v] of Object.entries(opts.params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    let res: Response;
    try {
      res = await this.fetchImpl(url.toString(), {
        method,
        headers: {
          Authorization: this.authHeader,
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

  async getSubstituteItems(
    entityCode: string,
    idCart = 0,
    pricingDate: string = ddmmyyyy(),
  ): Promise<string[]> {
    const data = await this.request<any>(MYMB_ENDPOINTS.GET_LISTA_ARTICOLI_ALTERNATIVI, {
      method: 'GET',
      params: { CodiceInternoArticolo: entityCode, IdElaborazione: idCart, DataPrezzatura: pricingDate },
    });
    const list = data?.GetListaArticoliAlternativiResult?.ListaPrezzatura ?? [];
    return Array.isArray(list) ? list.map((it: any) => it?.CodiceInternoArticolo) : [];
  }

  async getMultiplePrices(input: PriceQuery): Promise<Record<string, MyMbPriceEntry>> {
    const entityCodes = input.entityCodes ?? [];
    if (entityCodes.length === 0) return {};

    const pricingDate = input.pricingDate ?? ddmmyyyy();
    const body = {
      CodiceInternoCliente: input.customerCode,
      CodiceIndirizzo: input.addressCode,
      ListaCodiciInterniArticolo: entityCodes,
      DataPrezzatura: pricingDate,
      isCaricaListaImballi: input.loadPackingList ?? true,
      isCalcolaDisponibilita: input.calculateAvailability ?? true,
      isCalcolaArrivi: input.calculateArrivals ?? true,
      isCalcolaOrdinatoInPrecedenza: input.calculatePreviousOrders ?? true,
      IdElaborazione: input.idCart ?? '0',
      ListaQuantita: input.quantityList ?? new Array(entityCodes.length).fill(1),
    };

    const data = await this.request<any>(MYMB_ENDPOINTS.GET_PREZZATURA_MULTIPLA, { method: 'POST', body });
    const result = data?.GetPrezzaturaMultiplaResult;
    if (!result || result.ReturnCode !== 0) {
      throw new ErpError(`GetPrezzaturaMultipla error: ${result?.Message ?? 'unknown'}`, {
        endpoint: MYMB_ENDPOINTS.GET_PREZZATURA_MULTIPLA,
        returnCode: result?.ReturnCode,
      });
    }

    const out: Record<string, MyMbPriceEntry> = {};
    for (const price of result.ListaPrezzatura ?? []) {
      const entry = buildPriceEntry(price, this.settings);
      const label = entry.product_label_action;
      // Substitute fallback — Python: when nothing available and subs are managed.
      if ((label.quantity_available ?? 0) <= 0 && label.is_managed_substitutes) {
        const subs = await this.getSubstituteItems(entry.entity_code);
        label.prod_substitution = subs;
        entry.prod_substitution = subs;
      }
      out[entry.entity_code] = entry;
    }
    return out;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/vinc-erp && pnpm test -- mymb-erp-client`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app
git add packages/vinc-erp/src/mymb/mymb-erp-client.ts packages/vinc-erp/src/__tests__/mymb-erp-client.test.ts
git commit -m "feat(vinc-erp): MyMbErpClient request + getMultiplePrices + substitute fallback"
```

---

## Task 9: Barrel exports, full build, pack tgz

**Files:**
- Modify: `packages/vinc-erp/src/index.ts`

- [ ] **Step 1: Replace `src/index.ts` with the real barrel**

```ts
// Interface + error
export type { ErpClient, ErpErrorDetail } from './erp-client.js';
export { ErpError } from './erp-client.js';

// Cache
export type { CacheAdapter } from './cache.js';
export { NoopCacheAdapter } from './cache.js';

// Endpoints
export { MYMB_ENDPOINTS } from './endpoints.js';
export type { MyMbEndpoint } from './endpoints.js';

// Types
export type {
  MyMbErpSettings,
  PriceQuery,
  MyMbPriceEntry,
  ProductLabelAction,
  NormalizedPackagingOption,
} from './types/pricing.js';

// MYMB implementation
export { parseMyMbConnection } from './mymb/auth.js';
export type { MyMbConnection } from './mymb/auth.js';
export { MyMbErpClient } from './mymb/mymb-erp-client.js';
export type { MyMbErpClientConfig } from './mymb/mymb-erp-client.js';
export {
  getPackagingOptions,
  getLabelAndCartStatus,
  buildPriceEntry,
} from './mymb/transform.js';
```

- [ ] **Step 2: Run the full test suite + build**

Run: `cd packages/vinc-erp && pnpm test && pnpm build`
Expected: all tests PASS; `pnpm build` exits 0; `dist/index.d.ts` re-exports the symbols above.

- [ ] **Step 3: Pack the tgz** (matches how vinc-pim ships)

Run: `cd packages/vinc-erp && pnpm pack`
Expected: creates `vinc-erp-1.0.0.tgz` in `packages/vinc-erp/`.

- [ ] **Step 4: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app
git add packages/vinc-erp/src/index.ts packages/vinc-erp/dist packages/vinc-erp/vinc-erp-1.0.0.tgz
git commit -m "feat(vinc-erp): barrel exports + build artifacts + packed tgz"
```

---

## Task 10: Add `vinc-erp` dependency to vinc-b2b

**Files:**
- Modify: `vinc-b2b/package.json`

- [ ] **Step 1: Add the dependency** in `vinc-b2b/package.json` next to `"vinc-pim"`

```json
    "vinc-erp": "^1.0.0",
```

- [ ] **Step 2: Install** (resolves from the packed tgz / registry the same way `vinc-pim` does)

Run: `cd vinc-b2b && pnpm install`
Expected: install succeeds; `node_modules/vinc-erp` symlink exists.

> If `pnpm install` cannot resolve `vinc-erp@^1.0.0` from the registry in this environment, add a lockfile override pointing at the local tgz (mirror however `vinc-pim` is resolved in this repo — check `pnpm-lock.yaml` for the `vinc-pim` resolution and replicate it for `vinc-erp`).

- [ ] **Step 3: Verify import resolves**

Run: `cd vinc-b2b && node -e "console.log(Object.keys(require('vinc-erp')))"`
Expected: prints exported names including `MyMbErpClient`, `parseMyMbConnection`, `ErpError`.

- [ ] **Step 4: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app/vinc-b2b
git add package.json pnpm-lock.yaml
git commit -m "chore: add vinc-erp dependency"
```

---

## Task 11: Redis-backed `CacheAdapter` in vinc-b2b

**Files:**
- Create: `vinc-b2b/src/lib/erp/redis-cache-adapter.ts`
- Test: `vinc-b2b/src/test/unit/redis-cache-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/cache/redis-cache', () => ({
  // Fake cachedJson: fresh-miss always produces (good enough for adapter contract).
  cachedJson: vi.fn(async (_key: string, _opts: unknown, producer: () => Promise<unknown>) => producer()),
}));

import { RedisCacheAdapter } from '@/lib/erp/redis-cache-adapter';
import { cachedJson } from '@/lib/cache/redis-cache';

describe('RedisCacheAdapter', () => {
  it('delegates to cachedJson with derived TTLs and a namespaced key', async () => {
    const adapter = new RedisCacheAdapter();
    const out = await adapter.getOrProduce('promo:C:A', 60, async () => 'v');
    expect(out).toBe('v');
    expect(cachedJson).toHaveBeenCalledOnce();
    const [key, opts] = (cachedJson as any).mock.calls[0];
    expect(key).toBe('erp:promo:C:A');
    expect(opts.softTtlMs).toBe(60_000);
    expect(opts.hardTtlSeconds).toBeGreaterThanOrEqual(60);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vinc-b2b && pnpm test -- redis-cache-adapter`
Expected: FAIL — cannot find `@/lib/erp/redis-cache-adapter`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { CacheAdapter } from 'vinc-erp';
import { cachedJson } from '@/lib/cache/redis-cache';

/**
 * CacheAdapter backed by the storefront's stale-while-revalidate Redis cache.
 * `ttlSeconds` is the freshness window; the hard Redis TTL is kept longer so a
 * stale copy survives for stale-if-error.
 */
export class RedisCacheAdapter implements CacheAdapter {
  async getOrProduce<T>(
    key: string,
    ttlSeconds: number,
    producer: () => Promise<T>,
  ): Promise<T> {
    return cachedJson<T>(
      `erp:${key}`,
      { softTtlMs: ttlSeconds * 1000, hardTtlSeconds: Math.max(ttlSeconds, ttlSeconds * 4) },
      producer,
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vinc-b2b && pnpm test -- redis-cache-adapter`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app/vinc-b2b
git add src/lib/erp/redis-cache-adapter.ts src/test/unit/redis-cache-adapter.test.ts
git commit -m "feat(erp): Redis-backed CacheAdapter for vinc-erp"
```

---

## Task 12: Fetch `erp_settings` data-model → `MyMbErpSettings`

**Files:**
- Create: `vinc-b2b/src/lib/erp/data-model-config.ts`
- Test: `vinc-b2b/src/test/unit/erp-data-model-config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { mapErpSettingsRecord, DEFAULT_ERP_SETTINGS } from '@/lib/erp/data-model-config';

describe('mapErpSettingsRecord', () => {
  it('maps a stored data object to typed MyMbErpSettings', () => {
    const settings = mapErpSettingsRecord({
      packaging_options_id: '3,1,2',
      is_managed_substitutes: true,
      is_managed_supplier_order: false,
      cases: [
        { case: 0, label: 'OK', add_to_cart: true },
        { case: 4, label: 'NO', add_to_cart: false },
      ],
      update_promo_seconds: 100,
      update_available_again_seconds: 200,
    });
    expect(settings.packagingOptionsId).toEqual([3, 1, 2]);
    expect(settings.isManagedSubstitutes).toBe(true);
    expect(settings.isManagedSupplierOrder).toBe(false);
    expect(settings.cases['0']).toEqual({ label: 'OK', addToCart: true });
    expect(settings.cases['4']).toEqual({ label: 'NO', addToCart: false });
    expect(settings.updatePromoSeconds).toBe(100);
    expect(settings.updateAvailableAgainSeconds).toBe(200);
  });

  it('falls back to defaults for missing/blank fields', () => {
    const settings = mapErpSettingsRecord({});
    expect(settings.packagingOptionsId).toEqual([]);
    expect(settings.updatePromoSeconds).toBe(DEFAULT_ERP_SETTINGS.updatePromoSeconds);
    expect(settings.cases).toEqual({});
  });

  it('ignores empty segments when parsing packaging_options_id', () => {
    expect(mapErpSettingsRecord({ packaging_options_id: '3, ,1,' }).packagingOptionsId).toEqual([3, 1]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vinc-b2b && pnpm test -- erp-data-model-config`
Expected: FAIL — cannot find `@/lib/erp/data-model-config`.

- [ ] **Step 3: Write the implementation**

```ts
import type { MyMbErpSettings } from 'vinc-erp';

export const DEFAULT_ERP_SETTINGS: MyMbErpSettings = {
  packagingOptionsId: [],
  isManagedSubstitutes: false,
  isManagedSupplierOrder: false,
  cases: {},
  updatePromoSeconds: 21600,
  updateAvailableAgainSeconds: 21600,
};

type StoredCase = { case?: number; label?: string; add_to_cart?: boolean };

/** Map a raw `erp_settings` record `data` object to typed settings. Pure. */
export function mapErpSettingsRecord(data: Record<string, unknown>): MyMbErpSettings {
  const packagingOptionsId = String(data.packaging_options_id ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  const cases: MyMbErpSettings['cases'] = {};
  if (Array.isArray(data.cases)) {
    for (const c of data.cases as StoredCase[]) {
      if (c && c.case != null) {
        cases[String(c.case)] = { label: c.label ?? '', addToCart: Boolean(c.add_to_cart) };
      }
    }
  }

  return {
    packagingOptionsId,
    isManagedSubstitutes: Boolean(data.is_managed_substitutes),
    isManagedSupplierOrder: Boolean(data.is_managed_supplier_order),
    cases,
    updatePromoSeconds: Number(data.update_promo_seconds ?? DEFAULT_ERP_SETTINGS.updatePromoSeconds),
    updateAvailableAgainSeconds: Number(
      data.update_available_again_seconds ?? DEFAULT_ERP_SETTINGS.updateAvailableAgainSeconds,
    ),
  };
}

interface FetchArgs {
  /** Commerce Suite base URL (tenant.api.pimApiUrl). */
  csBaseUrl: string;
  apiKeyId: string;
  apiSecret: string;
}

/**
 * Fetch the singleton `erp_settings` record from Commerce Suite for this tenant
 * (relation_id=_global, channel=b2b) and map it to typed settings. Returns
 * DEFAULT_ERP_SETTINGS if the record is absent.
 */
export async function fetchErpSettings(args: FetchArgs): Promise<MyMbErpSettings> {
  const url = new URL(
    `${args.csBaseUrl.replace(/\/+$/, '')}/api/b2b/data-models/erp_settings/records`,
  );
  url.searchParams.set('relation_id', '_global');
  url.searchParams.set('channel', 'b2b');

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'x-auth-method': 'api-key',
      'x-api-key-id': args.apiKeyId,
      'x-api-secret': args.apiSecret,
    },
  });
  if (!res.ok) return DEFAULT_ERP_SETTINGS;

  const json: any = await res.json();
  const record = json?.data?.items?.[0];
  if (!record?.data) return DEFAULT_ERP_SETTINGS;
  return mapErpSettingsRecord(record.data as Record<string, unknown>);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vinc-b2b && pnpm test -- erp-data-model-config`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app/vinc-b2b
git add src/lib/erp/data-model-config.ts src/test/unit/erp-data-model-config.test.ts
git commit -m "feat(erp): fetch + map erp_settings data-model to MyMbErpSettings"
```

---

## Task 13: Client factory (`getMyMbErpClient`)

Resolves connection URL (override → tenant → env), settings (data-model, cached), and the Redis cache adapter, then constructs `MyMbErpClient`.

**Files:**
- Create: `vinc-b2b/src/lib/erp/factory.ts`
- Test: `vinc-b2b/src/test/unit/erp-factory.test.ts`

- [ ] **Step 1: Write the failing test** (only the URL-resolution helper is unit-tested; the full factory needs tenant/IO)

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { resolveMyMbUrl } from '@/lib/erp/factory';

const ORIGINAL = { ...process.env };
afterEach(() => { process.env = { ...ORIGINAL }; });

describe('resolveMyMbUrl', () => {
  it('prefers the override env var', () => {
    process.env.MYMB_ERP_URL_OVERRIDE = 'http://u:p@local:1/x';
    process.env.MYMB_ERP_URL = 'http://u:p@prod:1/x';
    expect(resolveMyMbUrl(undefined)).toBe('http://u:p@local:1/x');
  });

  it('falls back to tenant URL, then base env', () => {
    delete process.env.MYMB_ERP_URL_OVERRIDE;
    process.env.MYMB_ERP_URL = 'http://u:p@prod:1/x';
    expect(resolveMyMbUrl('http://u:p@tenant:1/x')).toBe('http://u:p@tenant:1/x');
    expect(resolveMyMbUrl(undefined)).toBe('http://u:p@prod:1/x');
  });

  it('throws when no URL is configured', () => {
    delete process.env.MYMB_ERP_URL_OVERRIDE;
    delete process.env.MYMB_ERP_URL;
    expect(() => resolveMyMbUrl(undefined)).toThrow(/MYMB_ERP_URL/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vinc-b2b && pnpm test -- erp-factory`
Expected: FAIL — cannot find `@/lib/erp/factory`.

- [ ] **Step 3: Write the implementation**

```ts
import type { NextRequest } from 'next/server';
import { MyMbErpClient, parseMyMbConnection } from 'vinc-erp';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';
import { cachedJson } from '@/lib/cache/redis-cache';
import { RedisCacheAdapter } from './redis-cache-adapter';
import { fetchErpSettings, DEFAULT_ERP_SETTINGS } from './data-model-config';

/** Connection URL resolution: override env → tenant config → base env. */
export function resolveMyMbUrl(tenantUrl: string | undefined): string {
  const url = process.env.MYMB_ERP_URL_OVERRIDE || tenantUrl || process.env.MYMB_ERP_URL;
  if (!url) {
    throw new Error('No MYMB ERP URL configured (set MYMB_ERP_URL or MYMB_ERP_URL_OVERRIDE).');
  }
  return url;
}

async function getTenantBits(req: NextRequest) {
  if (isSingleTenant) {
    return {
      mymbUrl: undefined as string | undefined,
      csBaseUrl: process.env.PIM_API_URL || '',
      apiKeyId: process.env.PIM_API_KEY_ID || '',
      apiSecret: process.env.PIM_API_SECRET || '',
    };
  }
  const hostname =
    req.headers.get('x-tenant-hostname') || req.headers.get('host') || 'localhost';
  const tenant = await resolveTenant(hostname);
  return {
    mymbUrl: tenant?.api.mymbErpUrl,
    csBaseUrl: tenant?.api.pimApiUrl || process.env.PIM_API_URL || '',
    apiKeyId: tenant?.api.apiKeyId || '',
    apiSecret: tenant?.api.apiSecret || '',
  };
}

/**
 * Build a MyMbErpClient for the current request: connection from
 * resolveMyMbUrl, behavior from the cached erp_settings data-model, Redis cache
 * for the client's own read-through caching.
 */
export async function getMyMbErpClient(req: NextRequest): Promise<MyMbErpClient> {
  const bits = await getTenantBits(req);
  const { baseUrl, authHeader } = parseMyMbConnection(resolveMyMbUrl(bits.mymbUrl));

  const settings = await cachedJson(
    `erp:settings:${bits.csBaseUrl}`,
    { softTtlMs: 5 * 60_000, hardTtlSeconds: 3600 },
    async () => {
      if (!bits.csBaseUrl || !bits.apiKeyId) return DEFAULT_ERP_SETTINGS;
      return fetchErpSettings({
        csBaseUrl: bits.csBaseUrl,
        apiKeyId: bits.apiKeyId,
        apiSecret: bits.apiSecret,
      });
    },
  );

  return new MyMbErpClient({ baseUrl, authHeader, settings, cache: new RedisCacheAdapter() });
}
```

- [ ] **Step 4: Add `mymbErpUrl` to the tenant API type**

In `vinc-b2b/src/lib/tenant/types.ts`, add to `TenantApiConfig` (the interface starting at line 23):

```ts
  /** Optional per-tenant MYMB ERP connection URL (user:pass@host:port/base). */
  mymbErpUrl?: string;
```

And in `vinc-b2b/src/lib/tenant/service.ts`, in `fromDocument`'s `api: { ... }` block (around line 67), add:

```ts
      mymbErpUrl: doc.api?.mymb_erp_url || process.env.MYMB_ERP_URL || undefined,
```

Add `mymb_erp_url?: string;` to the `api?` shape of `TenantDocument` (near `b2b_api_url`, around line 40 in service.ts).

- [ ] **Step 5: Run test + type-check**

Run: `cd vinc-b2b && pnpm test -- erp-factory && npx tsc --noEmit src/lib/erp/factory.ts`
Expected: tests PASS (3); `tsc` reports no errors for the file.

- [ ] **Step 6: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app/vinc-b2b
git add src/lib/erp/factory.ts src/lib/tenant/types.ts src/lib/tenant/service.ts src/test/unit/erp-factory.test.ts
git commit -m "feat(erp): MyMbErpClient factory + mymbErpUrl tenant config"
```

---

## Task 14: `/api/erp/[...path]` route — `get_multiple_prices`

Maps the snake_case path to the client method, returning the `{ status:'success', data }` envelope the existing `transformErpPricesResponse` expects.

**Files:**
- Create: `vinc-b2b/src/app/api/erp/[...path]/route.ts`
- Test: `vinc-b2b/src/test/api/erp-route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';

const getMultiplePrices = vi.fn();
vi.mock('@/lib/erp/factory', () => ({
  getMyMbErpClient: vi.fn(async () => ({ getMultiplePrices })),
}));

import { POST } from '@/app/api/erp/[...path]/route';
import { NextRequest } from 'next/server';

function req(path: string, body: unknown) {
  return new NextRequest(`http://localhost/api/erp/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/erp/[...path]', () => {
  it('dispatches get_multiple_prices and wraps the result in a success envelope', async () => {
    getMultiplePrices.mockResolvedValue({ ART1: { entity_code: 'ART1', net_price: 9 } });
    const res = await POST(req('get_multiple_prices', {
      entity_codes: ['ART1'], quantity_list: [1], id_cart: '0',
      customer_code: 'C', address_code: 'A',
    }), { params: Promise.resolve({ path: ['get_multiple_prices'] }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('success');
    expect(json.data.ART1.net_price).toBe(9);
    expect(getMultiplePrices).toHaveBeenCalledWith(expect.objectContaining({
      customerCode: 'C', addressCode: 'A', entityCodes: ['ART1'], quantityList: [1], idCart: '0',
    }));
  });

  it('returns 404 for an unknown endpoint', async () => {
    const res = await POST(req('nope', {}), { params: Promise.resolve({ path: ['nope'] }) });
    expect(res.status).toBe(404);
  });

  it('returns 502 when the client throws', async () => {
    getMultiplePrices.mockRejectedValue(new Error('erp down'));
    const res = await POST(req('get_multiple_prices', { entity_codes: ['X'], customer_code: 'C', address_code: 'A' }),
      { params: Promise.resolve({ path: ['get_multiple_prices'] }) });
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vinc-b2b && pnpm test -- erp-route`
Expected: FAIL — cannot find the route module.

- [ ] **Step 3: Write the implementation**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getMyMbErpClient } from '@/lib/erp/factory';

type RouteParams = { params: Promise<{ path: string[] }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  const endpoint = path.join('/');

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const client = await getMyMbErpClient(req);

    switch (endpoint) {
      case 'get_multiple_prices': {
        const data = await client.getMultiplePrices({
          customerCode: body.customer_code,
          addressCode: body.address_code,
          entityCodes: body.entity_codes ?? [],
          quantityList: body.quantity_list,
          idCart: body.id_cart,
        });
        return NextResponse.json({ status: 'success', data });
      }
      default:
        return NextResponse.json(
          { status: 'error', message: `Unknown ERP endpoint: ${endpoint}` },
          { status: 404 },
        );
    }
  } catch (error) {
    console.error(`[ERP route] ${endpoint} failed:`, error);
    return NextResponse.json(
      { status: 'error', message: (error as Error).message },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vinc-b2b && pnpm test -- erp-route`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app/vinc-b2b
git add src/app/api/erp/[...path]/route.ts src/test/api/erp-route.test.ts
git commit -m "feat(erp): /api/erp/[...path] route dispatching get_multiple_prices"
```

---

## Task 15: Theme-keyed `erpApiBase()` + wire into `fetchErpPrices`

**Files:**
- Create: `vinc-b2b/src/framework/basic-rest/utils/erp-api-base.ts`
- Test: `vinc-b2b/src/test/unit/erp-api-base.test.ts`
- Modify: `vinc-b2b/src/framework/basic-rest/erp/prices.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { erpApiPath } from '@/framework/basic-rest/utils/erp-api-base';

describe('erpApiPath', () => {
  it('routes the time theme to the direct ERP path', () => {
    expect(erpApiPath('time', '/erp/get_multiple_prices')).toBe('/api/erp/get_multiple_prices');
  });

  it('routes other themes to the legacy proxy-relative endpoint (unchanged)', () => {
    expect(erpApiPath('default', '/erp/get_multiple_prices')).toBe('/erp/get_multiple_prices');
    expect(erpApiPath(undefined, '/erp/get_multiple_prices')).toBe('/erp/get_multiple_prices');
  });
});
```

> Note: the legacy `post()` helper already prefixes `/api/proxy/b2b`, so non-time themes must keep returning the **relative** endpoint (`/erp/...`). For the time theme we return an **absolute** app path (`/api/erp/...`); the modified `fetchErpPrices` passes absolute paths straight to axios (which ignores `baseURL` for absolute URLs only if they include an origin — so see Step 5 for using `fetch`/full handling).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vinc-b2b && pnpm test -- erp-api-base`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
/**
 * Resolve the request path for an ERP endpoint based on the active theme.
 *
 * - time theme  → the in-app direct-ERP route: `/api/erp/<endpoint>`
 * - other themes → the legacy proxy-relative endpoint (unchanged): `<endpoint>`
 *   (the shared `post()` helper prefixes `/api/proxy/b2b`).
 *
 * `relativeEndpoint` is the legacy value, e.g. `/erp/get_multiple_prices`.
 */
export function erpApiPath(
  theme: string | undefined,
  relativeEndpoint: string,
): string {
  if (theme === 'time') {
    // Strip a leading `/erp` segment; mount under `/api/erp`.
    const tail = relativeEndpoint.replace(/^\/?erp\//, '');
    return `/api/erp/${tail}`;
  }
  return relativeEndpoint;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd vinc-b2b && pnpm test -- erp-api-base`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire it into `fetchErpPrices`** — modify `src/framework/basic-rest/erp/prices.tsx`

The current `fetchErpPrices` always calls `post(API_ENDPOINTS_B2B.ERP_PRICES, ...)`. Add a `theme` parameter and, for the time theme, call the absolute `/api/erp/...` path with `fetch` (so the axios `/api/proxy/b2b` baseURL is bypassed); otherwise keep the existing `post()` path verbatim.

```tsx
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { transformErpPricesResponse } from '@utils/transform/erp-prices';
import { erpApiPath } from '@framework/utils/erp-api-base';

interface ErpPricesPayload {
  entity_codes: string[];
  quantity_list?: number[];
  id_cart: string;
  customer_code: string;
  address_code: string;
  /** Active theme — when 'time', fetch directly from /api/erp. */
  theme?: string;
}

export const fetchErpPrices = async (input: ErpPricesPayload) => {
  const { entity_codes, quantity_list, id_cart, customer_code, address_code, theme } = input;

  const finalPayload = {
    entity_codes,
    quantity_list: quantity_list ?? new Array(entity_codes.length).fill(1),
    id_cart,
    customer_code,
    address_code,
  };

  let rawResponse: unknown;
  if (theme === 'time') {
    const res = await fetch(erpApiPath('time', API_ENDPOINTS_B2B.ERP_PRICES), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalPayload),
    });
    rawResponse = await res.json();
  } else {
    rawResponse = await post(API_ENDPOINTS_B2B.ERP_PRICES, finalPayload);
  }

  return transformErpPricesResponse(rawResponse);
};
```

- [ ] **Step 6: Pass the theme from the caller**

Find the call site(s) of `fetchErpPrices` (the pricing hook). Run:
`cd vinc-b2b && grep -rn "fetchErpPrices" src/`
In `src/framework/basic-rest/pricing/use-product-price.ts`, the hook already has access to the theme via `useThemeId()` (`src/contexts/tenant.context.tsx`). Import and read it:

```tsx
import { useThemeId } from '@/contexts/tenant.context';
// inside the hook:
const theme = useThemeId();
// ...where fetchErpPrices is called, add `theme` to the payload:
const data = await fetchErpPrices({ /* existing fields */, theme });
```

(If `fetchErpPrices` is invoked outside React in a server context, pass the resolved theme string available there instead; do not call the hook outside a component.)

- [ ] **Step 7: Type-check the touched files**

Run: `cd vinc-b2b && npx tsc --noEmit src/framework/basic-rest/erp/prices.tsx src/framework/basic-rest/utils/erp-api-base.ts`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app/vinc-b2b
git add src/framework/basic-rest/utils/erp-api-base.ts src/test/unit/erp-api-base.test.ts src/framework/basic-rest/erp/prices.tsx src/framework/basic-rest/pricing/use-product-price.ts
git commit -m "feat(erp): theme-keyed erpApiPath; time theme fetches prices from /api/erp"
```

---

## Task 16: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full package test + build**

Run: `cd packages/vinc-erp && pnpm test && pnpm build`
Expected: all tests PASS; build exits 0.

- [ ] **Step 2: vinc-b2b targeted tests**

Run: `cd vinc-b2b && pnpm test -- erp`
Expected: `redis-cache-adapter`, `erp-data-model-config`, `erp-factory`, `erp-route`, `erp-api-base` suites PASS.

- [ ] **Step 3: Manual smoke (dev server)** — confirm the default theme is untouched and the time theme hits `/api/erp`

Run: `cd vinc-b2b && pnpm dev` (per CLAUDE.md, dev server only — never `pnpm build`).
- With a default-theme tenant, load a product list → Network shows requests to `/api/proxy/b2b/erp/get_multiple_prices` (unchanged).
- With `NEXT_PUBLIC_THEME=time` (and `MYMB_ERP_URL` set), load a product list → Network shows `POST /api/erp/get_multiple_prices` returning `{ status:'success', data:{...} }`, and prices/availability render identically.

Expected: time theme uses the new route; default theme unchanged.

- [ ] **Step 4: Final commit (if any verification fixups were needed)**

```bash
cd /home/jire87/software/www-website/www-data/vendereincloud-app/vinc-b2b
git add -A
git commit -m "test(erp): end-to-end verification for time-theme direct pricing"
```

---

## Notes for the implementer

- **NodeNext imports:** inside `packages/vinc-erp`, all relative imports MUST use the `.js` extension (e.g. `from './cache.js'`), even though the source is `.ts`. This matches vinc-pim.
- **Never run `pnpm build` in vinc-b2b** (CLAUDE.md). Use `pnpm dev` and `npx tsc --noEmit <file>` for type checks.
- **Commit messages:** no `Co-Authored-By` / `Generated with` lines (CLAUDE.md). Use `--no-verify` if pre-existing lint errors block a commit.
- **Drop-in contract:** the package's `getMultiplePrices` reproduces the Python `product_data_dict` shape exactly, so the existing `transformErpPricesResponse` (consumed by time-theme components) needs no change.

## Follow-on plans (not in this plan)

1. **Promos & related items** — `getPromoByCustomer` (+ `parse_promo_data`, Redis-cached via `CacheAdapter`), `getAvailableAgainItems`, `getAccessoryItems`, `getAlternativeItems`. New route cases mapping `/api/erp/get_promo_by_customer` etc.
2. **Account documents** — orders, invoices, DDT, customer, addresses, exposition, deadlines, latest-order, category lookups, VAT/tax lookup, registration. Includes GET binary passthrough for PDF/barcode/CSV.
3. **Cart / ATP / payment** — cart anomalies, cart promo info, ATP availability, update cart rows with date, CMPAG payment status.

Each reuses the package scaffold, `request()`, `CacheAdapter`, factory, and route dispatch from this plan.
