# ERP / B2B Profile Error Banner — Design

**Date:** 2026-05-11
**Status:** Approved (pending spec review)

## Problem

When a logged-in B2B user has a misconfigured ERP profile (bad/missing `customer_code` /
`address_code`, or no ERP account behind the SSO identity), the customer-context backend
calls fail:

- `POST /api/proxy/b2b/erp/get_multiple_prices` → `500 Internal Server Error`
- `POST /api/proxy/pim/api/b2b/cart/active` → `400 Bad Request`

Today these errors are swallowed (e.g. `.catch(() => {})` in the price-loading effects,
React Query `enabled` gating on the cart). The user sees products with no prices and an
empty/non-loading cart, with **no explanation**. They cannot tell that the problem is
account-side, so they don't know to contact the shop.

## Goal

Surface a clear, persistent, non-dismissible top banner whenever an authenticated user's
ERP/B2B calls are failing, telling them there is a problem with their account profile and
to contact the tenant (shop). The banner clears automatically when ERP/B2B calls start
succeeding again (e.g. after the backend is fixed, or the user's context changes).

Non-goals: fixing the root cause on the backend; changing how prices/cart are fetched;
retry/backoff logic.

## Architecture

Three small pieces, plus i18n and a tenant-config addition.

### 1. `erp-health` store — `src/framework/basic-rest/erp/erp-health.ts`

A framework-agnostic module-level store (no React context):

- Internal state: `{ unhealthy: boolean }`.
- `reportErpFailure()` — sets `unhealthy = true`, notifies subscribers (idempotent).
- `reportErpSuccess()` — sets `unhealthy = false`, notifies subscribers (idempotent;
  no-op if already healthy).
- `subscribe(cb)` / `getSnapshot()` — for `useSyncExternalStore`.
- `useErpHealth()` — React hook returning `unhealthy: boolean`, implemented with
  `useSyncExternalStore` (SSR snapshot returns `false`).

Rationale: the detection point is an axios interceptor that lives outside React, so a
plain pub/sub store is the natural fit. `useSyncExternalStore` gives a clean, tearing-free
React binding.

### 2. Detection — axios response interceptor

New helper `addErpHealthInterceptor(client)` in `src/lib/auth` (next to the existing
`addAuthInterceptors`), wired into **both** axios instances:

- `src/framework/basic-rest/utils/httpB2B.ts`
- `src/framework/basic-rest/utils/httpPIM.ts`

Behaviour, on each response:

- **Success** (`2xx`) for a customer-context request → `reportErpSuccess()`.
- **Error** response with status in `400–599` **except `401`** (401 is the
  refresh-token path, already handled by `addAuthInterceptors`), for a customer-context
  request, **and** the user is authorized → `reportErpFailure()`. Then re-throw so
  existing call-site error handling is unchanged.

"Customer-context request" = request URL matches `/\/erp\//` or `/\/b2b\/cart/`
(covers `/erp/get_multiple_prices`, `/api/b2b/cart/active`, `/api/b2b/cart/order/...`,
etc.). This deliberately excludes generic PIM traffic (menus, search) so unrelated 4xx
responses don't trip the banner.

"Authorized" = `ERP_STATIC.customer_code` is truthy (avoids false positives during the
pre-login / pre-hydration window). `ERP_STATIC` is already importable from
`@framework/utils/static`.

Network errors (no `error.response`) are ignored — those are connectivity issues, not
profile issues.

### 3. `<ErpHealthBanner />` — `src/components/common/erp-health-banner.tsx`

Client component:

- `const { unhealthy } = useErpHealth();` — renders `null` when healthy.
- When `unhealthy`, renders a full-width sticky bar at the top of the viewport
  (`position: sticky; top: 0; z-index` above headers), warning colour scheme
  (amber/red), warning icon, no close button (non-dismissible per product decision).
- Copy is localized via `useTranslation(lang, 'common')`. The tenant name (and optional
  support contact) come from `useTenantOptional()` from `@/contexts/tenant.context`.
- Message shape:
  - Title: `error-erp-profile-title` → e.g. "There's a problem with your account"
  - Body: `error-erp-profile-body` with `{{tenant}}` interpolation → e.g.
    "We couldn't load your prices or cart. There may be an issue with your account
    profile — please contact {{tenant}} for assistance."
  - If `tenant.supportContact` is set, append a rendered link:
    - looks like an email → `mailto:`
    - looks like a phone (`+`/digits/spaces) → `tel:`
    - otherwise → plain `https://`/text link
- `lang` is needed for `useTranslation`. The banner is mounted from the `[lang]` layout,
  which already has `lang` in scope, so it's passed as a prop (same pattern as
  `ManagedModal lang={lang}`).

Mounting point: `src/app/[lang]/layout.tsx`, inside `<ManagedUIContext>`, immediately
before `{children}`:

```tsx
<ManagedUIContext>
  <ErpHealthBanner lang={lang} />
  {children}
  ...
```

This makes it appear above both the `default` and `time` theme headers regardless of
route.

### 4. Tenant config — optional `supportContact`

Add an optional field threaded through the existing tenant pipeline in
`src/lib/tenant/types.ts`:

- `TenantConfig.supportContact?: string` — read from the MongoDB tenant document.
- `TenantPublicInfo.supportContact?: string` — included in `toPublicInfo()`.
- `buildTenantFromEnv()` — populate from `process.env.NEXT_PUBLIC_SUPPORT_CONTACT`
  (single-tenant mode); leave `undefined` if not set.

Purely additive — no DB migration required; tenants without the field behave exactly as
before (banner shows tenant name only). The MongoDB documents can be updated out of band.

### 5. i18n keys

Add to **all** locale files under `src/app/i18n/locales/<lang>/common.json`
(`en, it, de, es, ar, he, zh`):

- `error-erp-profile-title`
- `error-erp-profile-body` (contains `{{tenant}}`)
- `error-erp-profile-contact-cta` (e.g. "Contact {{tenant}}") — used as the link label
  when `supportContact` is present

English values are written verbatim; the other six locales get translated values (Arabic
& Hebrew are RTL — the banner layout must not assume LTR; use logical CSS / flex which
already mirrors via the `dir` attribute on `<html>`).

## Data flow

```text
B2B/PIM axios call ──► response interceptor
   success (customer-context)  ──► reportErpSuccess() ──► store.unhealthy = false
   4xx/5xx ≠ 401 (customer-context, authorized) ──► reportErpFailure() ──► store.unhealthy = true
                                                          │
                                          (re-throws → existing handlers unchanged)
                                                          ▼
                                        useSyncExternalStore notifies subscribers
                                                          ▼
                                        <ErpHealthBanner> re-renders → shows/hides bar
```

## Error handling

- The interceptor never throws on its own; it only inspects and re-throws the original
  error. A bug in the health logic must not break API calls — wrap the inspection in a
  `try/catch` that swallows internal errors.
- `useErpHealth()` SSR snapshot is `false`, so the banner never renders on the server →
  no hydration mismatch.
- `useTenantOptional()` may return `undefined` in some contexts — fall back to a generic
  noun ("the store" / localized) for `{{tenant}}` and hide the contact link.

## Testing

Unit (`src/test/unit/`):

- `erp-health` store: `reportErpFailure` flips to unhealthy; `reportErpSuccess` flips
  back; subscribers notified; idempotent calls don't over-notify; `getSnapshot` reflects
  state.
- interceptor helper: given a mock axios error with `response.status` and `config.url`,
  asserts `reportErpFailure` is/ isn't called for: 500 on `/erp/...` (authorized) → yes;
  401 on `/erp/...` → no; 400 on `/api/search/...` → no; 500 on `/erp/...` while
  `ERP_STATIC.customer_code` empty → no; network error (no `response`) → no. Success on
  `/b2b/cart/active` → `reportErpSuccess` called.

Component (`src/test/components/`):

- `<ErpHealthBanner>` renders `null` when store healthy; renders title + body with tenant
  name interpolated when unhealthy; renders `mailto:` link when `supportContact` is an
  email; renders nothing extra when `supportContact` absent.

Manual: run `pnpm dev`, log in as a customer whose ERP profile is broken (or point at a
backend returning 500 for `get_multiple_prices`), confirm the banner appears; then fix
and confirm it clears after the next successful ERP/cart call.

## Files touched

- `src/framework/basic-rest/erp/erp-health.ts` — **new** (store + `useErpHealth`)
- `src/lib/auth/...` — **add** `addErpHealthInterceptor` (export alongside
  `addAuthInterceptors`)
- `src/framework/basic-rest/utils/httpB2B.ts` — wire interceptor
- `src/framework/basic-rest/utils/httpPIM.ts` — wire interceptor
- `src/components/common/erp-health-banner.tsx` — **new**
- `src/app/[lang]/layout.tsx` — mount `<ErpHealthBanner lang={lang} />`
- `src/lib/tenant/types.ts` — optional `supportContact` on `TenantConfig` /
  `TenantPublicInfo`; `toPublicInfo`, `buildTenantFromEnv`
- `src/lib/tenant/service.ts` — in the Mongo `doc → TenantConfig` mapping (~line 55–74,
  next to `builderUrl: doc.builder_url`), add `supportContact: doc.support_contact`
- `src/app/i18n/locales/{en,it,de,es,ar,he,zh}/common.json` — 3 new keys each
- Tests under `src/test/`
