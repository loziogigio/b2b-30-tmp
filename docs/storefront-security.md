# Storefront service credential boundary

Browser requests must not inherit the application's tenant service privileges.
The generic PIM proxy checks an exact path/method capability before resolving
credentials. Unknown routes, administrative routes, bulk customer reads and
unsupported methods are denied. Path segments containing encoding, separators,
dot traversal or URL syntax are rejected; upstream redirects are rejected.

`src/lib/security/storefront-proxy-policy.ts` is the browser capability list.
The Commerce Suite `src/lib/auth/storefront-access.ts` policy is its second
boundary. The storefront list is intentionally a subset: Suite also admits
fixed server wrappers such as language/catalog metadata requests. Review both
repositories when changing a capability. In particular, correlations are a GET
read: POST creates database records and must never be public.

Private operations require a live SSO validation with an active authenticated
user and the same tenant as the request. Authorization headers and the httpOnly
access-token cookie are only token candidates. Malformed, expired, revoked and
foreign-tenant sessions fail closed. Client-provided identity headers are
replaced with identity derived from SSO. Every Suite header builder adds
`x-vinc-client: storefront`; this identifies the caller class, and is never a
substitute for user authentication or a tenant service key.

Suite independently verifies the user and live customer/address grants for
cart, order and customer operations. Fixed storefront customer/address wrappers
also check their own ownership. ERP reads require an owned ERP customer code;
address-scoped reads require an enabled address. Document rows are read only
after locating that document in the owned customer/address list. Cart closure
looks up the Suite order, verifies its `shipping_address_code`, and derives the
ERP cart identifier server-side. Customer responses and authorization failures
carry `Cache-Control: private, no-store`.

## Profile records and documents

The fixed profile routes admit only `historical_order`, `invoice`,
`delivery_note`, `credit_exposure` and `payment_schedule`. Every list, detail
and document request requires a live SSO session before resolving service
credentials. List requests require an owned ERP customer code in `relation_id`;
duplicate query parameters are rejected. Returned records must match the
session's customer and its live address grant. VINC customer IDs cannot substitute
for ERP customer codes.

All profile calls to Suite include the validated bearer token and
`x-vinc-client: storefront`. Suite permits only GET for the five audited model
definitions and their records; other generic models and all model writes remain
denied to storefront clients. Definitions must be enabled, readable by end users
and related to customers. These permissions do not expose generic model routes
through the browser proxy.

Suite resolves the ERP customer code against the current customer record and
checks the portal user's live grants. Restricted address grants scope
`historical_order` through `data.shipping_address.code`, and `invoice` and
`delivery_note` through `data.destinazione.code`. Customer-wide models
(`credit_exposure` and `payment_schedule`) and records without an address require
an explicit `address_access: "all"` grant. Live SSO validation exposes this as
`user.customers[].has_all_address_access`, recomputed on every validation and
overwriting any old snapshot flag. Only a literal `true` allows B2B to accept
historical or newly added addresses absent from the session's address snapshot,
or customer-wide records. Restricted grants retain the explicit address check;
downgrades apply on the next validation. A filtered address list alone never
establishes an all-address grant. The same mandatory Suite scope is
applied before list pagination and totals and when reading individual records,
so client filters cannot broaden access.

Profile responses and upstream requests are not cached, including schema
availability probes. Upstream redirects are disabled and a denied request is
never retried with bare service credentials. Document downloads pass the same
record authorization before accessing the configured internal file root. Only
validated paths beneath `/documenti-clienti/` are accepted; encoded separators,
traversal, malformed encoding and file-server redirects are rejected.

## Session cookie (hidros V7, 2026-09-09)

The access token cookie (`auth_token`) is `HttpOnly`, `Secure` in production
and `SameSite=Lax`, like the refresh-token and session-id cookies. Browser
JavaScript never reads or writes it: every browser API call is same-origin
(`/api/proxy/pim`, `/api/proxy/b2b`, `/api/...`) and the route handlers read
the cookie server-side (`storefrontBearerToken`). Logged-in state and refresh
scheduling use the readable, non-secret `auth_token_expires_at` marker
(`hasAuthToken()`); `setAuthTokensClient` only writes that marker. Login,
callback, refresh and logout own the token cookies through `Set-Cookie`.
Regression test: `src/test/unit/auth-cookies-httponly.test.ts`.

## Anonymous search pricing (hidros V5, 2026-09-09)

The Suite search route strips packaging/pricelist tiers for callers without an
owned customer/address pair. The variant-grouped response carries a second copy
of the docs in `grouped.groups[].docs`; the strip and the tag filter now cover
that block too (Suite `applyPricingContext`). Keep the storefront proxy's search
sanitisation (`customer_code`/`address_code`/`tag_filter` replaced from SSO)
unchanged: it is what makes the Suite decision trustworthy. Suite hides every
price from anonymous searches on the `b2b` channel, so the proxy asserts
`channel: "b2b"` itself on every search body and GET query (an empty POST body
becomes `{}` first); a caller cannot omit or rewrite the channel to regain
guest pricing.

## Intentional compatibility changes

- The legacy B2B proxy admits only eight explicit ERP read adapters. Arbitrary
  upstream forwarding and unknown paths are unavailable.
- `check_coupon_cart` and `submit_coupon` return 403. These operations accept an
  opaque ERP cart identifier; re-enabling them requires a server-owned Suite
  order-to-ERP-cart lookup plus customer/address validation.
- Browser catalog pricing always uses ERP cart `0`. A caller-selected cart
  identifier cannot affect pricing or another document's context.
- ERP customer/address fields must match the identifiers and grants returned
  by SSO. Missing address grants no longer mean access to every address.
- Push preferences use GET/PATCH; subscriptions use GET/POST/DELETE. Anonymous
  access is limited to the VAPID public key.

Deploy the matching Suite and storefront changes together. Validate approved
flows in an isolated tenant: anonymous catalog, authenticated search/pricing,
cart create/save/delete, order detail/submit, selected addresses and push
preferences. Automated tests use mocks and do not validate production SSO/ERP
connectivity.

Service credentials must use server environment names: `API_KEY_ID` and
`API_SECRET`, or `PIM_API_KEY_ID` and `PIM_API_SECRET`. The obsolete
`NEXT_PUBLIC_API_KEY_ID`/`NEXT_PUBLIC_API_SECRET` fallbacks and Docker build
arguments have been removed. Before rebuilding, migrate deployments that use
those names to the server variables or the tenant registry. Real environment
files are not changed by this patch. Remove obsolete public variables from the
deployment configuration; if a service secret was previously included in a
published browser bundle, rotate it and invalidate the old build artifacts.
The security suite rejects public service-credential references in application
and Docker build sources while allowing intentional browser keys such as Google
Maps.

## Regression checks and CI

With application dependencies installed, run `pnpm test:security`.
The GitHub workflow `.github/workflows/security.yml` instead uses a small,
locked set of public test dependencies:

```sh
npm ci --prefix security --ignore-scripts
npm test --prefix security
```

This deliberately avoids a full application installation: the application
depends on `file:../../packages/vinc-mongo-db` and private packages, which a
standalone repository checkout cannot resolve. `security/package-lock.json`
contains public dependencies only. The suite imports the real authorization
helpers and route handlers, mocks SSO/ERP/upstream I/O, and substitutes a
throwing ERP client placeholder. No database or service secrets are required.

Security regression cases cover all exported HTTP methods, unknown/admin paths,
encoded traversal, invalid/revoked/expired/foreign tokens, malformed bearer
headers, spoofed identity, customer/address/document ownership, rejected
correlation writes, cache headers and allowed reads. The route inventory fails
when a new browser-facing API handler is added, including wrappers that obtain
service credentials indirectly.

When adding a route, document its intended public or private capability,
validate every resource selector, add a denied-before-upstream test and an
authorized behavior test, then update the inventory. Do not regenerate the
inventory solely to silence a failure. Configure the repository's merge rules
to require the `Storefront security / security` check; the workflow file alone
does not configure branch protection.
