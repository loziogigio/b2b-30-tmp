# Coupon flow (MyMB) — time theme

**Date:** 2026-06-09
**Area:** vinc-b2b time theme — cart, checkout, product detail
**Status:** Design — awaiting review

## Problem / Goal

Replicate the Deodato/MyMB PHP coupon flow inside vinc-b2b. A customer enters a
coupon on the cart; the MyMB backend is the authoritative re-pricer; the
JavaScript only does **display** math. The PHP shipped four thin proxy
endpoints; we reproduce all four in the vinc-b2b stack.

The coupon backend uses a **separate URL + credentials** from the existing ERP
connection. Phase 1 ships a **static** config; phase 2 moves that config into a
**channel-scoped** `coupon_settings` data model (per
`vinc-commerce-suite/docs/superpowers/specs/2026-06-09-channel-scoped-data-models-design.md`).
The feature is **active by default** in phase 1.

## Non-goals

- No authoritative pricing in JS — the cart/checkout JS math is display-only.
  The MyMB `UpdateTestataDocumentoConCoupon` call is the source of truth at
  order time.
- No new generic config mechanism — phase 2 reuses the existing data-model read
  path (`/api/b2b/data-models/<slug>/records`), mirroring `fetchErpSettings`.
- Basic-auth credentials are NOT stored in the data-model record (phase 2): the
  model carries `enabled` + `api_url`; creds stay in env. (Reversible — see
  Open decisions.)

---

## Architecture — three layers

Mirrors the four PHP proxies 1:1, but isolated from the ERP client because the
coupon backend has its own URL + credentials.

### Layer 1 — Coupon client (`vendor/vinc-erp`)

New `vendor/vinc-erp/src/mymb/coupon-client.ts`, next to `MyMbErpClient`. Takes
its own connection `{ baseUrl, authHeader }` and exposes four methods. Each is a
single MyMB **GET** with Basic auth + JSON passthrough (the PHP used GET for all
four).

| Method | MyMB service | GET params | Replaces |
| --- | --- | --- | --- |
| `validateCoupon(cliente, coupon)` | `GetStatoCouponCliente` | `codiceInternoCliente`, `codiceCoupon` | validate_coupon.php |
| `getCartCoupon(idCart)` | `GetInfoCouponFromDocumento` | `idElaborazione` | check_coupon_cart.php (step 1) |
| `submitCoupon(idElaborazione, coupon)` | `UpdateTestataDocumentoConCoupon` | `idElaborazione`, `codiceCoupon` | submit_coupon.php |
| `verifyPromoItem(cliente, indirizzo, articolo)` | `GetPromozioneBaseXArticolo` | `codiceInternoCliente`, `codiceIndirizzo`, `codiceInternoArticolo` | verify_promo_item.php |

- Endpoint constants → `vendor/vinc-erp/src/endpoints.ts`:
  `MYMB_COUPON_ENDPOINTS = { GET_STATO_COUPON_CLIENTE, GET_INFO_COUPON_FROM_DOCUMENTO, UPDATE_TESTATA_DOCUMENTO_CON_COUPON, GET_PROMOZIONE_BASE_X_ARTICOLO }`.
- The client returns the **raw MyMB JSON** verbatim (the frontend depends on the
  exact shapes below). It does not throw on `isValido !== 'S'`; it only throws
  (`ErpError`) on transport/HTTP failure, matching `MyMbErpClient.request`.
- Re-use the existing `request`-style fetch (Basic auth header, `Accept: json`).
  Factored so `coupon-client.ts` shares the transport with `mymb-erp-client.ts`
  (extract a tiny `mymbRequest` helper, or duplicate the ~20-line method — TBD
  in the plan; prefer extraction).
- Exported from `vendor/vinc-erp/src/index.ts`:
  `CouponClient`, `MYMB_COUPON_ENDPOINTS`, coupon response types.

### Layer 2 — Proxy route

Extend `src/app/api/erp/[...path]/route.ts` with four cases:
`validate_coupon`, `check_coupon_cart`, `submit_coupon`, `verify_promo_item`.

Each case:
1. `const cfg = await resolveCouponConfig(req)`.
2. If `!cfg.enabled` → `{ status: 'error', message: 'Coupons not enabled' }`
   (HTTP 200, no MyMB call). The `check_coupon_cart` case returns an empty/no-coupon
   result so checkout load is a no-op when disabled.
3. Build `new CouponClient({ baseUrl: cfg.baseUrl, authHeader: cfg.authHeader })`.
4. Call the matching method; echo `{ status: 'success', data: <raw MyMB JSON> }`.
5. `check_coupon_cart` is two-step server-side: `getCartCoupon(id_cart)` → read
   `GetInfoCouponFromDocumentoResult.m_Item2.Codice`; if absent →
   `{ status: 'error', message: 'No coupon on cart' }` (HTTP 200, treated as
   "nothing to re-display"); else `validateCoupon(cliente, codice)` and echo.
6. `ErpError`/transport failures → `{ status: 'error', message }` (existing
   pattern in this route).

Request bodies (POST JSON from the frontend):
- `validate_coupon`: `{ codiceInternoCliente, codiceCoupon }`
- `check_coupon_cart`: `{ codiceInternoCliente, id_cart }`
- `submit_coupon`: `{ idElaborazione, codiceCoupon }`
- `verify_promo_item`: `{ codiceInternoCliente, codiceIndirizzo, codiceInternoArticolo }`

> **Topology update (post-design discovery):** the time theme has **no separate
> cart page** — there is one `/checkout` route (`TimeCheckoutPage` → `TimeCartTable`
> + `TimeOrderSummary`); `time-cart.tsx` is only the mini-cart drawer. The reference's
> two-page flow therefore collapses onto one page. Decided flow: **`Applica` previews
> only (validate + display math, no persist); the coupon is persisted via
> `submit_coupon` inside the existing order-submit CTA, just before `submitOrder`;
> `checkCouponCart` re-displays a saved coupon on mount. No redirect step.** The
> implementation plan (`docs/superpowers/plans/2026-06-09-coupon-flow.md`) is the
> source of truth for this wiring.

### Layer 3 — Frontend (time theme)

- `src/lib/erp/coupon-config.ts` — `CouponConfig` type, `DEFAULT_COUPON_CONFIG`,
  `resolveCouponConfig(req)` (the phase seam — see Config), and phase-2
  `fetchCouponSettings(channel)`.
- `useCoupon` hook — state `{ code, status, discountPercent, message }`; actions
  `applyCoupon`, `submitCoupon`, `checkCouponCart`. Reads `customer_code` /
  `id_cart` from the existing `ERP_STATIC` (`src/framework/basic-rest/utils/static.ts`).
- `CouponBox` component — input + Apply + Proceed, rendered on the cart near
  `CartTotals`. Hidden when the config is disabled.
- `CartTotals` (`src/components/cart/cart-totals.tsx`) — accept an optional
  `discountPercent`; when set, render a "Sconto coupon −X%" line and recompute
  `net' = net − net·p/100`, `vat' = vat − vat·p/100`, `doc' = net' + vat'`.
- Checkout (`src/components/cart/checkout-flow.tsx` / `checkout-details*`) —
  call `checkCouponCart()` on mount, apply the same display math (read-only, no
  input box).
- Product detail (`time-theme` product page wiring) — `verifyPromoItem(articolo)`
  renders per-article promo info, independent of coupon state.

---

## Data flow

**Apply (cart, preview only)** — `applyCoupon(code)`:
1. POST `/api/erp/validate_coupon` `{ codiceInternoCliente: customer_code, codiceCoupon: code }`.
2. On `isValido === 'S'`: store `discountPercent = Math.abs(parseFloat(percentualeSconto))`,
   `message`. `CartTotals` recomputes display only. **No persistence.**
3. On non-`S`: show `Messaggio`.

**Submit (cart → checkout)** — `submitCoupon(code, redirectUrl)`:
1. Re-validate (`validate_coupon`). If not valid → **show the message** (a
   deliberate divergence from the PHP, which redirected anyway).
2. If valid → POST `/api/erp/submit_coupon` `{ idElaborazione: id_cart, codiceCoupon: code }`.
3. On `ReturnCode === 0` → redirect to checkout. Backend now owns repricing.

**Checkout load (re-display)** — `checkCouponCart()` on mount:
1. POST `/api/erp/check_coupon_cart` `{ codiceInternoCliente: customer_code, id_cart }`.
2. Proxy two-step (above). On success, apply the same display math; on
   "no coupon" / disabled, render nothing.

**Product detail** — `verifyPromoItem(articolo)`:
1. POST `/api/erp/verify_promo_item` `{ codiceInternoCliente, codiceIndirizzo, codiceInternoArticolo }`.
2. Render promo info.

### Response shapes the frontend depends on

Validation (`GetStatoCouponCliente` — `validate_coupon` & `check_coupon_cart`):

```json
{ "GetStatoCouponClienteResult": { "m_Item2": {
    "isValido": "S",
    "Messaggio": "...",
    "percentualeSconto": "10"
}}}
```

Persistence (`UpdateTestataDocumentoConCoupon` — `submit_coupon`):

```json
{ "UpdateTestataDocumentoConCouponResult": { "ReturnCode": 0 } }
```

Cart-coupon lookup (`GetInfoCouponFromDocumento` — `check_coupon_cart` step 1):

```json
{ "GetInfoCouponFromDocumentoResult": { "m_Item2": { "Codice": "ABC123" } } }
```

---

## Config — static → channel-scoped model

```ts
// src/lib/erp/coupon-config.ts
export type CouponConfig = {
  enabled: boolean;
  baseUrl: string;     // e.g. http://mymb.baseprotection.com:8884/MyMB/Service/web
  authHeader: string;  // "Basic " + base64(user:pass)
};

export const DEFAULT_COUPON_CONFIG: CouponConfig = {
  enabled: true, baseUrl: '', authHeader: '',
};
```

**Phase 1 — static.** `resolveCouponConfig(req)` reads env:
- `COUPON_API_URL` — full MyMB URL, optionally with embedded creds
  (`http://USER:PASS@host:8884/MyMB/Service/web`), parsed via the existing
  `parseMyMbConnection` → `{ baseUrl, authHeader }`.
- Optional `COUPON_API_USER` / `COUPON_API_PASSWORD` override/supply creds when
  the URL has none.
- Returns `{ enabled: true, baseUrl, authHeader }`. **Active by default.**

**Phase 2 — dynamic (channel-scoped).** New `coupon_settings` model,
`relation: "channel"`, one record per sales channel:

| Field (snake_case) | Type | Maps to |
| --- | --- | --- |
| `enabled` | checkbox | `config.enabled` |
| `api_url` | text | `baseUrl` |

`fetchCouponSettings(channel)` mirrors `fetchErpSettings`:
GET `/api/b2b/data-models/coupon_settings/records?channel=<code>` with the CS
API-key headers, map the record → `CouponConfig` (`authHeader` built from
`COUPON_API_USER`/`COUPON_API_PASSWORD` env), fall back to
`DEFAULT_COUPON_CONFIG` (which keeps the feature on) when absent.
`resolveCouponConfig` swaps its body from the env read to this call —
**no other code changes between phases.**

The channel comes from the tenant/theme channel resolution already used by the
storefront (the same `channel` value passed elsewhere; default `b2b`).

---

## Files touched (summary)

| File | Change |
| --- | --- |
| `vendor/vinc-erp/src/endpoints.ts` | Add `MYMB_COUPON_ENDPOINTS`. |
| `vendor/vinc-erp/src/mymb/coupon-client.ts` | New `CouponClient` (4 GET methods). |
| `vendor/vinc-erp/src/index.ts` | Export client + constants + types. |
| `src/app/api/erp/[...path]/route.ts` | 4 new cases + `resolveCouponConfig` wiring. |
| `src/lib/erp/coupon-config.ts` | `CouponConfig`, `DEFAULT_COUPON_CONFIG`, `resolveCouponConfig`, `fetchCouponSettings`. |
| `src/hooks/use-coupon.ts` | `useCoupon` hook. |
| `src/components/cart/coupon-box.tsx` | `CouponBox` UI. |
| `src/components/cart/cart-totals.tsx` | Optional `discountPercent` → discount line + recompute. |
| `src/components/cart/checkout-flow.tsx` (+ checkout details) | `checkCouponCart()` on mount + display math. |
| time-theme product detail wiring | `verifyPromoItem` render. |
| `.env.example` | `COUPON_API_URL` / `COUPON_API_USER` / `COUPON_API_PASSWORD`. |
| `src/test/...` | Tests (below). |

Phase 2 only (separate change, in `vinc-commerce-suite`): define the
`coupon_settings` channel-scoped model via the admin once the channel-scoped
data-models feature ships.

## Testing

- **coupon-client (unit, vinc-erp):** each method builds the right URL + Basic
  auth; returns raw JSON; throws `ErpError` on HTTP failure. Mock `fetch`.
- **proxy route (unit):** `validate_coupon` echoes MyMB JSON; `check_coupon_cart`
  two-step (missing `Codice` → "no coupon"); `submit_coupon` passes
  `idElaborazione`/`codiceCoupon`; disabled config → no MyMB call.
- **cart totals (unit):** `discountPercent = 10` → net/vat/doc reduced 10%,
  discount line rendered; absent → unchanged.
- **config (unit):** `resolveCouponConfig` parses `COUPON_API_URL` (with/without
  embedded creds); phase-2 `fetchCouponSettings` maps a record and falls back to
  default when absent.

Run via `vitest run` (vinc-b2b) and the `vinc-erp` package tests.

## i18n

Coupon UI strings go through the existing i18n (`t()`), keys added to `en`/`it`/`sk`
per project convention. (The reference Italian labels — "Sconto coupon",
"Codice coupon" — become translation values.)

## Edge cases / notes

- **Missing `customer_code` / `id_cart`** (guest / empty `ERP_STATIC`):
  `CouponBox` is hidden; `checkCouponCart` no-ops.
- **Display vs billing:** the JS totals are never used for billing — the order
  send re-reads authoritative totals from MyMB after `submit_coupon`.
- **Coupon backend host:** `COUPON_API_URL` is a full URL, so the coupon host
  may differ from the ERP host or coincide with it — no assumption made.
- **`check_coupon_cart` 500 in PHP:** the PHP returned HTTP 500 on a missing
  `Codice`; we return a soft "no coupon" instead so checkout load never errors.

## Open decisions (confirm during review)

1. **Phase-2 credentials:** current design keeps Basic-auth creds in env
   (`COUPON_API_USER`/`COUPON_API_PASSWORD`); the model carries only `enabled` +
   `api_url`. Alternative: add `username`/`password` text fields to the model
   (matches "all static vars in the model", but stores creds readable via the CS
   API). Default chosen: **creds in env**.
2. **Transport sharing:** extract a shared `mymbRequest` helper in `vinc-erp` vs
   duplicate the ~20-line fetch in `coupon-client.ts`. Default: **extract**.
