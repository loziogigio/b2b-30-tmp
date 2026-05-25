# Time theme: `vinc-erp` package + `MyMbErpClient` (direct MYMB ERP integration)

**Date:** 2026-05-25
**Status:** Approved (design) — pending spec review before implementation plan
**Scope:** time theme only; default theme is unchanged

## 1. Problem & Goal

Today vinc-b2b reaches the MYMB ERP through two hops:

```
browser → /api/proxy/b2b/* → B2B_API_URL (Python vinc-api) → ErpClient.py → MYMB ERP
```

The Python `ErpClient.py` (`dfl-api/app/services/ErpClient.py`) wraps the raw MYMB ERP
webservice (PascalCase endpoints: `GetPrezzaturaMultipla`, `GetCliente`,
`GetTestatePromoPerCliente`, …) with Basic auth, plus normalization, Redis caching and
some `os.getenv`-driven business config.

**Goal:** for the **time theme only**, port `ErpClient.py` to a TypeScript module that runs
inside vinc-b2b and talks to the MYMB ERP **directly** over the private network (server-to-
server), removing the Python hop and processing requests synchronously in-request. The port
is delivered as a **standalone package** (`vinc-erp`) that mirrors how `vinc-pim` is built and
consumed, and is designed as the **reusable standard** for future ERP integrations: a
provider-agnostic `ErpClient` interface with `MyMbErpClient` as the first implementation.

The **default theme path is byte-for-byte unchanged** — it keeps using
`/api/proxy/b2b/*` → Python `vinc-api`.

## 2. Architecture & data flow

```
browser (time theme)    → /api/erp/* (NEW)            → MyMbErpClient → MYMB ERP (private net, Basic auth)
browser (default theme) → /api/proxy/b2b/* (UNCHANGED) → vinc-api      → ErpClient.py → MYMB ERP
```

The new package is **server-side only** and framework-free (like `vinc-pim`): no Next.js, no
`ioredis`, no React. Redis and tenant/data-model config are **injected** by vinc-b2b.

"Process immediately" = the route awaits the client and returns the normalized result in the
same request (synchronous); no queue.

### Layout

```
packages/vinc-erp/                 ← NEW standalone package (mirrors packages/vinc-pim)
  src/index.ts                     barrel exports
  src/erp-client.ts                ErpClient interface (provider-agnostic contract)
  src/types/                       canonical DTOs (ErpPriceData, OrderDoc, InvoiceDoc, …)
  src/cache.ts                     CacheAdapter interface (no Redis dependency)
  src/endpoints.ts                 MYMB endpoint path constants (GetPrezzaturaMultipla, …)
  src/mymb/mymb-erp-client.ts      MyMbErpClient implements ErpClient (the TS port)
  src/mymb/transform.ts            raw MYMB JSON → canonical DTOs
  src/mymb/auth.ts                 parse MYMB_ERP_URL → base URL + Basic-auth header
  src/__tests__/                   vitest unit tests
  vitest.config.ts, tsconfig.json, package.json, README.md

vinc-b2b/
  src/app/api/erp/[...path]/route.ts   internal routes (time theme); dispatch to MyMbErpClient
  src/lib/erp/factory.ts               build client from URL + data-model config + Redis CacheAdapter
  src/lib/erp/data-model-config.ts     fetch erp_settings record from Commerce Suite → MyMbErpSettings
  src/lib/erp/redis-cache-adapter.ts   CacheAdapter impl over existing redis-cache.ts
  (time-theme ERP fetchers point at /api/erp/* via erpApiBase(); default theme untouched)
```

## 3. The `ErpClient` interface & `MyMbErpClient`

The package exports one provider-agnostic interface. Method names are clean camelCase TS;
each maps to a MYMB endpoint and returns a **canonical DTO** that is drop-in compatible with
what the time theme already consumes (e.g. `ErpPriceData` as defined today in
`src/framework/basic-rest/types/pim-pricing.ts`). `MyMbErpClient` is the faithful port of
`ErpClient.py`.

```ts
interface ErpClient {
  // Pricing (core)
  getMultiplePrices(input: PriceQuery): Promise<Record<string, ErpPriceData>>;
  getPackagingListByArticle(entityCode: string, manageDefault?: boolean): Promise<PackagingOption[]>;

  // Promos & related items
  getPromoByCustomer(customerCode: string, addressCode: string, promoType?: string): Promise<PromoData>;
  getAvailableAgainItems(customerCode: string, addressCode: string, monthsBack?: number): Promise<string[]>;
  getAccessoryItems(entityCode: string, idCart?: number, pricingDate?: string): Promise<string[]>;
  getSubstituteItems(entityCode: string, idCart?: number, pricingDate?: string): Promise<string[]>;
  getAlternativeItems(itemCode: string, opts?: { idElaborazione?: string; pricingDate?: string }): Promise<AlternativeItems | null>;

  // Account documents
  getOrders(q: DocQuery): Promise<OrderDoc[]>;
  getInvoices(q: DocQuery): Promise<InvoiceDoc[]>;     // includes the Python's field-mapping
  getDdt(q: DocQuery): Promise<DdtDoc[]>;
  getCustomer(customerCode: string): Promise<CustomerInfo>;
  getAddresses(customerCode: string): Promise<AddressInfo[]>;
  getExposition(customerCode: string): Promise<Exposition>;
  getUpdatedExposition(customerCode: string): Promise<Exposition>;
  getPaymentDeadlines(customerCode: string): Promise<PaymentDeadline[]>;
  getUpdatedDeadlines(customerCode: string): Promise<PaymentDeadline[]>;
  getLatestOrderByItem(customerCode: string, itemId: string): Promise<LatestOrderByItem>;
  getLatestOrderByPeriod(q: LatestOrderQuery): Promise<LatestOrderByPeriod>;
  getCommercialActivityCategories(): Promise<CategoryList>;
  getCustomerCategoryTypes(): Promise<CategoryTypeList>;
  getClienteByVatOrTaxCode(q: { vat?: string; taxCode?: string }): Promise<ClienteLookup>;
  createClienteFromRegistration(form: RegistrationForm): Promise<string | null>;

  // Cart / ATP / payment
  checkCartAnomalies(q: { idCart: string; keepIssueFlag?: boolean }): Promise<CartAnomalies>;
  getInfoPromotionInCart(q: { idCart: string; rowId: string; promoCode: string; promoRow: string }): Promise<CartPromoInfo | null>;
  infoAvailabilityForItem(q: { itemList: ATPItem[] }): Promise<ATPResult>;
  updateCartRowWithDate(q: { itemList: ATPItem[]; idCart: string }): Promise<ATPResult>;
  setCmpagPaymentStatus(q: { idElaborazione: string; isPaymentExecuted: boolean; paymentMethodCode: string }): Promise<CmpagResult>;
}
```

### `MyMbErpClient` preserves the Python behavior exactly

- A shared private `request(endpoint, method, { params, body })` mirrors `ErpClient.request`:
  Basic-auth header, `ReturnCode !== 0` handling, GET binary (non-JSON content-type)
  passthrough, errors raised as a typed `ErpError`.
- The heavy `getMultiplePrices` mapping is ported field-for-field into `transform.ts`:
  packaging options (`packaging_option_smallest` / `_default` / `_all` / ordered
  `packaging_options`), the improving-promo vs listino branch, discount arrays,
  `product_label_action`, and the substitute fallback.
- `parse_promo_data` / `convert_date` ported into `transform.ts`.
- The Python static helpers become **injected config**, not `os.getenv`:
  - `get_packaging_options` ← `packagingOptionsId: number[]`
  - `get_label_and_cart_status` ← `isManagedSubstitutes`, `isManagedSupplierOrder`, `cases`

### Naming

- Package: **`vinc-erp`**
- Client class: **`MyMbErpClient`**

## 4. Config: connection (env) + behavior (data-model)

Config splits into two tiers. The package itself is config-agnostic — everything is injected,
which keeps it the reusable standard.

### 4a. Connection — env / secret

A **single URL with embedded credentials** (not separate user/pass vars):

```
MYMB_ERP_URL=http://<user>:<pass>@<erp-host>:<port>/MyMB/Service/web
             └─user─┘ └pwd┘ └──────host:port───────┘└──base path──┘
MYMB_ERP_URL_OVERRIDE=...        # local/dev override (same format)
```

(real credentials/host live only in the deployment env/secret, never in the repo)

`src/mymb/auth.ts` parses the URL once: strips `user:pass@` → `Authorization: Basic
base64(user:pass)`; request base = `scheme://host:port/path`.

**Resolution order** (in `factory.ts`): `MYMB_ERP_URL_OVERRIDE` → `tenant.api.mymbErpUrl`
→ `MYMB_ERP_URL`. Follows the existing `*_URL_OVERRIDE` convention already in `.env`
(`PIM_API_URL_OVERRIDE`, `SSO_API_URL_OVERRIDE`). None are `NEXT_PUBLIC_*`.

### 4b. Behavior — Commerce Suite data-model `erp_settings`

The business config (formerly `PACKAGING_OPTIONS_ID`, `IS_MANAGED_SUBSTITUTES`,
`IS_MANAGED_SUPPLIER_ORDER`, `CASES`, TTLs) is authored per tenant in the Commerce Suite
admin (`.../b2b/admin/data-models`) and fetched by vinc-b2b at runtime (Redis-cached).

**Data-model definition (create in vinc-commerce-suite):**

| Attribute | Value |
|---|---|
| `name` | `ERP Settings (MyMB)` |
| `slug` | `erp_settings` (must match `^[a-z][a-z0-9_]*$`) |
| `relation` | `customer` |
| `cardinality` | `single` |
| `channel` | `b2b` |
| `readable_by_end_user` | `false` (server-side only — never exposed to browser) |
| `enabled` | `true` |
| sentinel `relation_id` | `_global` |

**Fields:**

| field `slug` | `type` | notes |
|---|---|---|
| `packaging_options_id` | `text` | comma-separated packaging IDs in display order, e.g. `3,1,2` |
| `is_managed_substitutes` | `checkbox` | boolean |
| `is_managed_supplier_order` | `checkbox` | boolean |
| `cases` | `array_of_objects` | sub-fields: `case` (`number`, 0–5), `label` (`text`), `add_to_cart` (`checkbox`) |
| `update_promo_seconds` | `number` | default `21600` (6h) |
| `update_available_again_seconds` | `number` | default `21600` (6h) |

**Fetch:** `GET {CS}/api/b2b/data-models/erp_settings/records?relation_id=_global&channel=b2b`
with the tenant API key/secret vinc-b2b already holds for Commerce Suite calls.

**Stored `data` shape:**
```json
{
  "packaging_options_id": "3,1,2",
  "is_managed_substitutes": true,
  "is_managed_supplier_order": false,
  "cases": [
    { "case": 0, "label": "Disponibile",      "add_to_cart": true  },
    { "case": 1, "label": "Sostituto+Arrivo", "add_to_cart": true  },
    { "case": 2, "label": "Sostituto",        "add_to_cart": true  },
    { "case": 3, "label": "In arrivo",        "add_to_cart": true  },
    { "case": 4, "label": "Non disponibile",  "add_to_cart": false },
    { "case": 5, "label": "Non gestito",      "add_to_cart": false }
  ],
  "update_promo_seconds": 21600,
  "update_available_again_seconds": 21600
}
```

**Typed config the package consumes** (`data-model-config.ts` maps stored → this; `cases`
array → record keyed by case string, matching the Python `get_label_and_cart_status` lookup):
```ts
interface MyMbErpSettings {
  packagingOptionsId: number[];                 // "3,1,2" → [3,1,2]
  isManagedSubstitutes: boolean;
  isManagedSupplierOrder: boolean;
  cases: Record<string, { label: string; addToCart: boolean }>;  // "0".."5"
  updatePromoSeconds: number;
  updateAvailableAgainSeconds: number;
}
```

### 4c. Client factory

`src/lib/erp/factory.ts` → `getMyMbErpClient(req): MyMbErpClient`:
resolve tenant → connection URL (4a) + `MyMbErpSettings` (4b) + wrap existing Redis as a
`CacheAdapter`; memoized per resolved config.

## 5. Internal routes & the time-theme switch

### Routes — `src/app/api/erp/[...path]/route.ts`

One catch-all dispatched to client methods. Paths mirror the existing snake_case so the
frontend swap is just a base-URL change:

```
POST /api/erp/get_multiple_prices  → client.getMultiplePrices(...)
POST /api/erp/get_orders           → client.getOrders(...)
POST /api/erp/get_invoices         → client.getInvoices(...)
...                                   (one mapping per in-scope interface method)
```

Each route: read body → resolve client via factory → `await` method → return normalized
JSON. Forwards the user's JWT/customer context exactly like the current proxy.

### The switch (only consumer-side change)

A tiny base resolver in the B2B framework:
```ts
erpApiBase() → theme === 'time' ? '/api/erp' : '/api/proxy/b2b'
```
Existing fetchers (`fetchErpPrices`, orders, invoices, …) call
`post(erpApiBase() + endpoint, …)`. Because responses are already drop-in normalized,
**time-theme components need no changes**, and the default theme resolves to the unchanged
proxy base. This single resolver is the entire gating mechanism, theme-keyed.

## 6. Caching, error handling & edge cases

- **Caching (parity with the Python, via injected `CacheAdapter`):**
  `getPromoByCustomer` keyed `promo:{customer}:{address}`; `getAvailableAgainItems` keyed
  `available_again_items:{customer}:{address}`; each honoring its `MyMbErpSettings` TTL.
  Replaces the Python's `eval(cached)` with `JSON.parse`. The data-model config is cached
  too (short TTL). **Pricing stays uncached** (live), matching today.
- **Error handling:** `request()` maps failures to a typed `ErpError`
  `{ endpoint, status, message, returnCode }`; routes translate to HTTP (502 upstream/
  network, 4xx bad input, 200 + normalized body otherwise). `ReturnCode !== 0` → list
  endpoints return empty/structured per the Python; pricing throws (the Python raises). The
  existing ERP-health interceptor keeps working since routes still emit JSON errors.
- **Edge cases ported faithfully:** GET binary passthrough (non-JSON content-type → raw
  bytes, for PDF/barcode/CSV); `getMultiplePrices` empty `entity_codes` → `{}`; substitute
  fallback (`quantity_available <= 0 && is_managed_substitutes` → `getSubstituteItems`);
  promo validity date parsing; `id_cart` defaulting.

## 7. Testing

Mirrors `vinc-pim`'s vitest setup (package ships its own `vitest.config.ts`).

- **Package unit tests** (`packages/vinc-erp/src/__tests__/`): `transform.ts` is the
  highest-value target — recorded raw MYMB JSON fixtures (improving-promo branch, listino
  branch, packaging ordering, substitute fallback, `getLabelAndCartStatus` all 6 cases) →
  assert canonical DTO output. `auth.ts` URL parse (userinfo extraction, override
  precedence). `CacheAdapter` TTL logic with a fake clock + in-memory adapter.
- **vinc-b2b side** (per [src/test/TESTING_STANDARDS.md](../../../src/test/TESTING_STANDARDS.md)):
  route tests for `/api/erp/*` (mock client, assert dispatch + JWT forwarding + error→HTTP
  mapping); `data-model-config.ts` test (stored→typed mapping, `cases` array→record,
  comma-split); factory test (URL resolution order).
- **No live ERP calls in tests** — MYMB host is private-net; everything runs against
  fixtures/mocks.

## 8. Build, consumption & rollout

- **Build/ship like `vinc-pim`:** `packages/vinc-erp/` with `tsc` build → `dist/`,
  `exports`/`types` map, ships as `vinc-erp-1.0.0.tgz`; vinc-b2b consumes it as
  `"vinc-erp": "^1.0.0"`. Follows the established tgz pattern (pnpm-workspace.yaml is empty
  today), not a workspace link, to keep parity with `vinc-pim`.
- **No browser exposure:** imported only from server code (`src/app/api/erp/*`,
  `src/lib/erp/*`); never referenced in client components (no `'use client'`, no React import).
- **Rollout / safety:** time theme is the only consumer; default theme path is unchanged. The
  `erpApiBase()` resolver is the single switch. If MYMB direct calls misbehave, flipping the
  resolver (or a tenant flag) reverts time-theme traffic to the old proxy without code changes
  elsewhere.
- **Docs:** package `README.md` (interface + how to add a new ERP provider); a vinc-b2b note
  on the `erp_settings` data-model + `MYMB_ERP_URL`.

## 9. Out of scope

- Changing the default theme's ERP path.
- A second ERP provider implementation (the interface is built to allow it; none is built now).
- Migrating the Python `vinc-api` or removing it.
- Write paths to ERP beyond what `ErpClient.py` already does (cart anomaly resolution,
  registration, CMPAG payment status are included because the Python has them).
