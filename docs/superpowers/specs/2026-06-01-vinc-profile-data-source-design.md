# VINC-backed Customer Profile Data Source (default theme)

- **Date:** 2026-06-01
- **Status:** Approved design — pending spec review
- **Branch context:** `feature/pim-inline-pricing`
- **Author/driver:** loziogigio

## 1. Summary

For the **`default` theme**, source the four customer-profile data domains from
the **VINC Commerce Suite data-models API** instead of the legacy B2B REST
proxy. The active **theme** (already resolved from the backend/tenant config via
`useThemeId()`) is the single switch that selects the data source — there is no
separate per-request env flag in the decision path.

Domains, in build order:

1. `order_history` → VINC model `historical_order`
2. `credit_exposure` → VINC model `credit_exposure`
3. `delivery_note` → VINC model `delivery_note`
4. `invoice` → VINC model `invoice`

When a VINC data-model is **not available** for the tenant, the page renders its
**normal empty state** — there is **no fallback** to the legacy proxy for these
domains under the default theme.

## 2. Theme-driven source model

The theme implies every source decision:

| Theme (from backend) | UI theme | Pricing source                    | Account data (orders · credit · DDT · invoices)        |
| -------------------- | -------- | --------------------------------- | ------------------------------------------------------ |
| **`time`**           | time     | ERP (time services, `/api/erp/…`) | ERP (time services, `/api/erp/…`) — **unchanged**      |
| **`default`**        | default  | inline (PIM)                      | **VINC data-models**; empty state if model unavailable |
| _other/unknown_      | (theme)  | (current resolution)              | legacy proxy — **unchanged safety net**                |

Only the **`default`** theme's account-data path changes in this work. The
`time` theme keeps its direct-ERP path verbatim, and any other/unknown theme
keeps the legacy proxy path verbatim.

### 2.1 Source-policy seam

Today pricing source is resolved from `tenant.features.pricingSource` →
`NEXT_PUBLIC_PRICING_SOURCE` → `'inline'` (see
`src/framework/basic-rest/pricing/pricing-source.ts`). The long-term intent is
to **derive source from the theme** and retire `NEXT_PUBLIC_PRICING_SOURCE`.

This work introduces one small, theme-keyed seam and wires **account** through
it now. Pricing keeps its existing resolution untouched in this task; pointing
pricing at `sourcePolicy(theme).pricing` becomes a one-line follow-up (see
§12 Out of scope).

```ts
// src/framework/basic-rest/profile/source-policy.ts  (new)
export type AccountSource = 'erp' | 'vinc'; // 'erp' here = the existing path (time→/api/erp, others→legacy proxy)
export type PricingSourceHint = 'erp' | 'inline';

export interface SourcePolicy {
  account: AccountSource; // consumed NOW
  pricing: PricingSourceHint; // documented seam for the future migration
}

// Explicit allow-lists — an unknown theme must NOT silently become 'vinc'.
const VINC_ACCOUNT_THEMES = new Set(['default']);
const INLINE_PRICING_THEMES = new Set(['default']);

export function sourcePolicy(theme: string | undefined): SourcePolicy {
  const t = theme ?? 'default';
  return {
    account: VINC_ACCOUNT_THEMES.has(t) ? 'vinc' : 'erp',
    pricing: INLINE_PRICING_THEMES.has(t) ? 'inline' : 'erp',
  };
}
```

**Decision — unknown themes:** the VINC branch is gated by an explicit
allow-list (`VINC_ACCOUNT_THEMES = {'default'}`), so only the known `default`
theme resolves to `account: 'vinc'`. `time` and every other/unknown theme
resolve to `'erp'`, and the hooks keep their existing routing for that case
(`time → /api/erp`, anything else → legacy proxy). A new theme cannot
accidentally route account data to VINC — it must be added to the allow-list
deliberately.

> Note: `account: 'erp'` is a coarse "use the existing path" signal. The hook,
> not the policy, decides _which_ existing path (`/api/erp` for `time` vs legacy
> proxy otherwise), because that branch already exists today and is unchanged.

## 3. Architecture (Approach A — hook decides, single source per branch)

The four React Query hooks each gain a VINC branch. The existing `time` branch
and the legacy-proxy branch are preserved.

```
useOrdersListQuery / useExpositionQuery / useDocumentsListQuery(F|DDT)
   │  theme = useThemeId()
   ├─ theme === 'time'                         → /api/erp/…        (UNCHANGED)
   ├─ sourcePolicy(theme).account === 'vinc'   (default theme)
   │     → GET /api/profile/<model>?relation_id=<customer_code>&…   (new BFF route)
   │          • resolve tenant creds (pimApiUrl / apiKeyId / apiSecret)
   │          • cached probe (Redis ~5m soft / 1h hard): is the model available?
   │          • available  → fetch /records?… → return { available:true, items, pagination }
   │          • unavailable → return { available:false, items:[] }
   │     → map items → existing UI shape (OrderSummary / Exposition / DocumentRow)
   │     → render data, OR the page's existing empty state. NO proxy fallback.
   └─ else (other/unknown theme)               → legacy proxy     (UNCHANGED)
```

**Why Approach A** (vs a fully server-side unified route): it leaves the proven
ERP/proxy fetch paths and their Bearer-token auth interceptor completely
intact and only adds a VINC-first branch. No server-to-server auth forwarding.
When VINC is available the hook makes exactly one request; when unavailable the
verdict is cached so the route returns immediately.

## 4. The VINC profile BFF route (generic)

One generic route serves all four models since they share the same envelope and
query semantics (`relation_id`, `filter[…]`, `sort=-data.…`, `page`/`limit`).

- **File:** `src/app/api/profile/[model]/route.ts` (new) — list.
- **File:** `src/app/api/profile/[model]/[id]/route.ts` (new) — single record by
  `_id` (needed for order detail; reused by future detail views).
- **Method:** `GET` (query params), to align with the data-models API and allow
  HTTP caching later. Body-less.

### 4.1 Model allow-list (security)

```ts
const PROFILE_MODELS = {
  historical_order: true,
  credit_exposure: true,
  invoice: true,
  delivery_note: true,
} as const;
```

Any `model` not in this set → `404`. This prevents the api-key from being used
to read arbitrary tenant data-models from the browser.

### 4.2 Request → upstream mapping

Client query params are translated to the VINC data-models query syntax:

| Client param               | Upstream                         | Notes                                                |
| -------------------------- | -------------------------------- | ---------------------------------------------------- |
| `relation_id`              | `relation_id`                    | **required**; the customer scope (= `customer_code`) |
| `status`                   | `filter[status]=<v>`             | exact match on `data.status`                         |
| `date_from` (`YYYY-MM-DD`) | `filter[document_date][gte]=<v>` |                                                      |
| `date_to` (`YYYY-MM-DD`)   | `filter[document_date][lte]=<v>` |                                                      |
| `document_number`          | `filter[document_number]=<v>`    | for number lookups                                   |
| `page`                     | `page`                           | 1-indexed                                            |
| `limit`                    | `limit`                          | default 50                                           |
| `sort`                     | `sort`                           | default `-data.document_date` (newest first)         |

**Never** forward `external_ref` as a query param (per the integration guide it
bypasses tenant scoping and returns the whole tenant's records). Only
`relation_id` scopes a request.

### 4.3 Upstream call

```
GET ${pimApiUrl}/api/b2b/data-models/${model}/records?<translated query>
headers:
  Accept: application/json
  x-auth-method: api-key
  x-api-key-id: <tenant.apiKeyId>
  x-api-secret: <tenant.apiSecret>
```

Tenant credentials resolve exactly as in `fetchErpSettings`
(`src/lib/erp/data-model-config.ts`) and `/api/b2b/addresses`
(`src/app/api/b2b/addresses/route.ts`): single-tenant → env
(`PIM_API_URL` etc.); multi-tenant → `resolveTenant(hostname)` →
`tenant.api.{pimApiUrl,apiKeyId,apiSecret}`.

### 4.4 Response contract (route → client)

```jsonc
// available
{ "available": true,
  "items": [ /* raw VINC records: { _id, relation_id, data:{…}, … } */ ],
  "pagination": { "page": 1, "limit": 50, "total": 76, "totalPages": 2 } }

// unavailable
{ "available": false, "items": [] }
```

The route returns **raw VINC records**; per-domain mapping to the existing UI
shape happens client-side in the framework transform layer (mirrors the current
`transformOrdersList` / `transformExposition` / `transformDocumentsList`
pattern, keeping mappers pure and unit-testable).

### 4.5 Security / correctness requirements

- Model allow-list (§4.1).
- Only `relation_id` scoping; reject/ignore `external_ref`.
- `relation_id` is currently supplied by the client (`ERP_STATIC.customer_code`),
  matching today's trust model for `/api/erp/*`. **Recommended hardening (noted,
  not required for parity):** validate the requested `relation_id` against the
  authenticated session's allowed customer codes before calling upstream.
- Credentials never reach the browser (route is server-only).

## 5. Availability probe + caching

- **Probe:** `GET ${pimApiUrl}/api/b2b/data-models/${model}` (the model/schema
  endpoint). `200` ⇒ available; `404`/network error ⇒ unavailable.
- **Cache:** reuse the Redis `cachedJson` helper used for `erp_settings`
  (`src/lib/erp/factory.ts`), key
  `vinc:profile:available:${tenantId}:${model}`, `softTtlMs: 5*60_000`,
  `hardTtlSeconds: 3600`. Availability is a **tenant-level**, slow-moving fact.
- **Flow in the route:** read cached verdict → if `available`, go straight to
  `/records`; if no verdict yet, probe, cache it, then `/records`. Steady state
  is one upstream `/records` request plus a cached verdict.
- **"Available but zero records"** and **"model unavailable"** both render the
  same empty state, so no "feature disabled" UI is needed.

## 6. Per-domain specifications

### 6.1 `order_history` → `historical_order` (list **and** detail)

Schema is known from the integration guide. Order detail **is in scope** here —
it is existing parity (the list rows already link to a detail page), distinct
from the deferred "richer VINC-only" views.

**List mapping — VINC `data.*` → `OrderSummary`**
(`src/framework/basic-rest/order/types-b2b-orders-list.ts`):

| `OrderSummary` field                | VINC source                                  | Notes                                                  |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `id`                                | `_id`                                        | stable key; **also the detail lookup key** (see below) |
| `destination`                       | `data.shipping_address.label`                | fallback: `street, city`                               |
| `date_label`                        | `data.document_date`                         | format `DD/MM/YYYY`                                    |
| `document`                          | `data.document_number`                       | already `OC/9345`, `PB2B/126291`                       |
| `delivery_label`                    | `data.delivery_date`                         | `DD/MM/YYYY`; may be empty                             |
| `ordered_total`                     | `data.total`                                 | number                                                 |
| `status_code`                       | `data.status`                                | enum (see §6.1.1)                                      |
| `status_label`                      | `data.status_label ?? localize(data.status)` |                                                        |
| `doc_number` / `cause` / `doc_year` | parsed from `data.document_number`           | best-effort; primary key for VINC detail is `_id`      |

#### 6.1.1 Status enum → filter & label

VINC statuses: `draft, submitted, to_fulfill, in_transit, fulfilled, invoiced,
cancelled`. Italian label fallback (when `status_label` empty):

| status       | label       |
| ------------ | ----------- |
| `draft`      | Bozza       |
| `submitted`  | Inviato     |
| `to_fulfill` | Da evadere  |
| `in_transit` | In consegna |
| `fulfilled`  | Evaso       |
| `invoiced`   | Fatturato   |
| `cancelled`  | Annullato   |

**Filter-chip mapping:** the existing orders page filters by an ERP `type`
(`T`/`NE`/`E`/`IA`). For the VINC branch these map to `filter[status]`:
Tutti → no filter; Da evadere → `to_fulfill`; In consegna → `in_transit`;
Evaso → `fulfilled`. The exact chip→status table is finalized in the orders
implementation step against the live data (the current chip set lives in the
orders client component).

**Two-records gotcha:** a web order appears first as `PB2B/…` (`to_fulfill`) and
later **also** as `OC/…` (`fulfilled`) — distinct VINC records. Show **both**;
do **not** merge client-side.

**Date range / sort / pagination:** `date_from`/`date_to` →
`filter[document_date][gte|lte]` (`YYYY-MM-DD`); default `sort=-data.document_date`;
`limit` default 50. Note the existing ERP params use `DDMMYYYY`; the VINC branch
converts the page's date pickers to `YYYY-MM-DD`.

#### 6.1.2 Order detail — key threading + enrichment (IN SCOPE)

**Detail key threading:** add an optional `vincId?: string` (and a `source:
'erp' | 'vinc'`) to `OrderSummary`. When `source === 'vinc'`, the order-detail
navigation/hook fetches by `_id` via `/api/profile/historical_order/<id>`. When
`source === 'erp'`, behaviour is unchanged (NumeroDoc/Causale/Anno).

The VINC detail block is **richer than the current ERP detail**, which stubs
most values. We **enrich** the order-detail view with the VINC data rather than
flattening it to today's shape. Current gaps the VINC detail fills:

| Current `TransformedOrder`          | Today (ERP)              | VINC enrichment                                             |
| ----------------------------------- | ------------------------ | ----------------------------------------------------------- |
| `discount` / `tax` / `delivery_fee` | hardcoded `0`            | real `discount_total` / `vat_total` / `shipping_cost`       |
| `total`                             | `= sub_total` (computed) | authoritative `data.total` (+ `subtotal`, `currency`)       |
| currency                            | (none)                   | `data.currency`                                             |
| status                              | (none)                   | `data.status` + label (§6.1.1)                              |
| payment / agent / notes             | (none)                   | `data.payment_method`, `data.agent_code`, `data.notes`      |
| `shipping_address.state/zip`        | empty strings            | `province`, `postal_code` (+ `label`, `code`)               |
| item VAT / discounts / line total   | (none)                   | per line `vat_rate`, decoded `discounts_json`, `line_total` |
| item uom / unit price               | `unit` / `price`         | `uom` / `unit_price` (same slots)                           |

**Implementation:** extend `TransformedOrder` and `TransformedOrderItem` with
**optional** enrichment fields (`currency?`, `status?`, `statusLabel?`,
`vatTotal?`, `discountTotal?`, `shippingCost?`, `paymentMethod?`, `agentCode?`,
`notes?`; per-item `vatRate?`, `discounts?: number[]`, `lineTotal?`,
`entityCode?`, `lineNumber?`; address `province?`/`postalCode?`/`label?`).
A new pure transform `vincOrderDetail → TransformedOrder` populates them from
the VINC `data` block; the existing ERP `transformOrder` leaves them
`undefined`/`0` (unchanged). `discounts_json` is a **string** — `JSON.parse(...
|| "[]")`; render as `10% + 5%`. `erp_meta.{csoci,ycale,oelen,causale,channel}`
goes into an advanced/debug panel only.

**Detail component:** `src/components/orders/order-details.tsx` renders the new
fields **conditionally** (`field != null`), so the ERP path is visually
unchanged and the VINC path shows the fuller breakdown (currency-aware totals,
VAT, discounts, status badge, payment/agent/notes, full address, richer items
table). This is the one place a richer UI is intentionally added in this
iteration.

### 6.2 `credit_exposure` → `credit_exposure` (single record)

- **Target UI shape:** existing `Exposition`
  (`src/framework/basic-rest/acccount/types-b2b-account.ts`) — currency + 9 row
  groups (`directRemittances*`, `riba*`, `unbilledBills*`, `ordersNotFulfilled*`,
  `prebills*`, `advancesTotal`, `trust*`, `creditLimitTotal`, `total2Total`,
  `differenceTotal`).
- **Shape:** likely one record per `relation_id`; the route returns `items[]`,
  the hook takes `items[0]?.data`.
- **Field mapping — OPEN (needs schema):** the exact VINC `credit_exposure`
  field names are **not yet known**. The implementation step for this domain
  **must first pull the schema** (`GET /api/b2b/data-models/credit_exposure`)
  and fill a mapping table whose **output is the `Exposition` shape above**
  (the parity contract). No detail view.

### 6.3 `delivery_note` → `delivery_note` (DDT list)

- **Target UI shape:** existing `DocumentRow` with `doc_type: 'DDT'`
  (`src/framework/basic-rest/documents/types-b2b-documents.ts`).
- **Field mapping — OPEN (needs schema):** pull
  `GET /api/b2b/data-models/delivery_note`, map to `DocumentRow`
  (`destination, dateISO, date_label, document, number, …`).
- **Document actions (PDF/barcode):** **OPEN decision.** The current DDT row
  exposes a **barcode-PDF** action that calls the ERP wrapper
  (`/wrapper/pdf_barcode_document`) through the proxy. VINC list records are not
  known to expose a rendered PDF. Default assumption to confirm at this phase:
  **keep the existing action endpoints for the buttons** (document _rendering_
  is orthogonal to list _data source_), OR map a VINC-provided document URL if
  the schema exposes one. If neither is acceptable and actions must not touch the
  proxy, the buttons are hidden under VINC. **Resolve when the schema arrives.**

### 6.4 `invoice` → `invoice` (invoice list)

- **Target UI shape:** existing `DocumentRow` with `doc_type: 'F'`.
- **Field mapping — OPEN (needs schema):** pull
  `GET /api/b2b/data-models/invoice`, map to `DocumentRow` (incl. optional
  `invoice_number, taxable, total`).
- **Document actions (PDF/barcode/CSV):** same OPEN decision as §6.3.
- **Richer invoice UI (payment status / scadenze):** **out of scope** for this
  iteration (deferred richer detail). List parity only.

> The DDT and invoice lists share `useDocumentsListQuery`; the VINC branch picks
> the model by `params.type` (`'DDT'` → `delivery_note`, `'F'` → `invoice`),
> mirroring the existing `pickListEndpoint` / `pickErpEndpoint` switch.

## 7. Empty & unavailable behavior

- Model unavailable, or available with zero records, or upstream error in the
  VINC branch → the hook resolves to an **empty result**; the page shows its
  existing empty state (e.g. "Nessun ordine"). No menu hiding, no error banner,
  no proxy fallback.
- React Query config stays as today: `staleTime` 5 min, `gcTime` 10 min,
  `refetchOnWindowFocus: false`.

## 8. Error handling

- Route: upstream `5xx`/network → log + return `{ available:true, items:[] }`
  is **wrong** (would mask outages as "no data"). Instead: probe failure ⇒
  `available:false`; `/records` failure after a positive probe ⇒ HTTP `502` with
  `{ status:'error' }`. The client hook treats a non-OK VINC response as empty
  for display purposes (consistent with §7) but the 502 is logged for ops.
- No secrets in any error payload returned to the browser.

## 9. Build sequencing (one plan, four phases)

1. **Foundation + orders:** `source-policy.ts`, the generic
   `/api/profile/[model]` route (+ `/[id]`), availability probe + cache, VINC
   order list mapper, **enriched** order-detail-by-`_id` (§6.1.2: extend
   `TransformedOrder`, new VINC detail transform, conditional detail-UI fields),
   wire `useOrdersListQuery` & order-detail. Prove the pattern end to end.
2. **credit_exposure:** pull schema, mapper → `Exposition`, wire
   `useExpositionQuery`.
3. **delivery_note (DDT):** pull schema, mapper → `DocumentRow`, wire
   `useDocumentsListQuery('DDT')`, resolve actions decision (§6.3).
4. **invoice:** pull schema, mapper → `DocumentRow`, wire
   `useDocumentsListQuery('F')`, resolve actions decision (§6.4).

Each later phase reuses the foundation; only a mapper + one hook branch per
domain.

## 10. Testing strategy

Follows `src/test/TESTING_STANDARDS.md`.

- **Unit (pure mappers):** VINC record → `OrderSummary` / `Exposition` /
  `DocumentRow`; VINC detail → **enriched** `TransformedOrder` (totals/currency,
  `vat_total`, `discount_total`, `shipping_cost`, status, payment/agent/notes,
  full address, per-line `vat_rate`/`discounts`/`line_total`); status enum →
  label; `document_number` parsing; `discounts_json` parsing; date formatting.
  Edge cases: missing `shipping_address.label`, null `delivery_date`, zero
  items, absent enrichment fields (ERP path → fields stay unset/`0`).
- **Unit (query translation):** client params → VINC `filter[…]`/`sort`/paging;
  `external_ref` never emitted; unknown model rejected.
- **Unit (source policy):** `time→erp`, `default→vinc`, unknown→legacy
  (non-vinc).
- **Route/integration:** available vs unavailable verdict (mocked upstream),
  cache hit path, allow-list `404`, probe-failure ⇒ `available:false`,
  records-failure-after-positive-probe ⇒ `502`.
- **Hook:** default theme + available ⇒ VINC data; default theme + unavailable ⇒
  empty; `time` theme ⇒ untouched ERP path; unknown theme ⇒ proxy path.

## 11. File-by-file change list

**New**

- `src/framework/basic-rest/profile/source-policy.ts` — theme → source seam.
- `src/app/api/profile/[model]/route.ts` — generic list route (probe + cache +
  query translation + allow-list).
- `src/app/api/profile/[model]/[id]/route.ts` — single record by `_id`.
- `src/framework/basic-rest/profile/vinc-data-model.ts` — small client helper:
  `fetchProfileRecords(model, params)` / `fetchProfileRecord(model, id)` calling
  the BFF route and returning `{ available, items, pagination }`.
- `src/utils/transform/vinc-historical-order.ts` — VINC → `OrderSummary`
  (list) and VINC detail → **enriched** `TransformedOrder` (§6.1.2).
- `src/utils/transform/vinc-credit-exposure.ts` — VINC → `Exposition` _(phase 2)_.
- `src/utils/transform/vinc-delivery-note.ts` — VINC → `DocumentRow` _(phase 3)_.
- `src/utils/transform/vinc-invoice.ts` — VINC → `DocumentRow` _(phase 4)_.
- Matching tests under `src/test/unit/` and `src/test/api/`.

**Modified**

- `src/framework/basic-rest/order/fetch-orders-list.ts` — add VINC branch.
- `src/framework/basic-rest/order/types-b2b-orders-list.ts` — add optional
  `source` / `vincId` to `OrderSummary`.
- `src/framework/basic-rest/order/fetch-order.ts` (detail) — VINC-by-`_id`
  branch returning the enriched `TransformedOrder`.
- `src/utils/transform/b2b-order.ts` — add optional enrichment fields to
  `TransformedOrder` / `TransformedOrderItem` (ERP path leaves them unset).
- `src/components/orders/order-details.tsx` — conditionally render the enriched
  fields (totals breakdown, VAT, discounts, status, payment/agent/notes, full
  address, richer items table).
- `src/framework/basic-rest/acccount/fetch-account.ts` — `fetchExposition` VINC
  branch _(phase 2)_.
- `src/framework/basic-rest/documents/fetch-documents-list.ts` — VINC branch by
  `type` _(phases 3–4)_; possibly the actions path (pending §6.3/§6.4 decision).
- Orders client component — chip → `filter[status]` mapping for the VINC branch.

**Untouched (explicitly):** `time` theme paths (`/api/erp/*`, the
`theme === 'time'` branches) and the legacy `/api/proxy/b2b/*` route.

## 12. Out of scope / future work

- **Pricing from theme:** repoint pricing-source resolution at
  `sourcePolicy(theme).pricing` and retire `NEXT_PUBLIC_PRICING_SOURCE`. The seam
  is created here; the switch is a separate change.
- **Richer VINC-only views:** invoice payment status / scadenze. (Order detail
  enrichment is now **in scope** — see §6.1.2.)
- **`relation_id` hardening:** validate against the authenticated session.
- **Multi-address union:** customers with multiple `cod_cliente` mappings —
  union records across `relation_id`s client-side. Most users have one mapping.

## 13. Open questions (tracked, resolved per phase)

1. **Schemas for `credit_exposure`, `invoice`, `delivery_note`** — exact VINC
   field names. Resolved by pulling `GET /api/b2b/data-models/<slug>` at the
   start of each domain's phase and filling its mapping table (output shape is
   fixed by the existing `Exposition` / `DocumentRow` types).
2. **Document actions under VINC** (§6.3/§6.4) — keep ERP wrapper endpoints for
   PDF/barcode/CSV, map a VINC document URL, or hide the buttons. Decide when the
   invoice/DDT schemas arrive.
3. **Orders filter chips** — confirm the exact current chip set and finalize the
   chip → `filter[status]` table during phase 1.
