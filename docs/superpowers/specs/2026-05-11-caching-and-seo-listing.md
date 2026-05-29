# Task B — Static-content caching parity + SSR-paginated SEO category page (vinc-b2b)

Status: **spec, awaiting review**. Sibling to the Task-A footer work (already committed).

## Context

`vinc-b2c` (Nuxt) has a worked-out story for serving "static" content fast and keeping
it fresh: upstream PIM data is cached server-side, push-invalidated when the admin
publishes, and re-warmed immediately. `vinc-b2b` (Next.js) has only ad-hoc `next: { revalidate: 300 }`
on a few fetches, no on-demand invalidation, and a `force-dynamic` home page. We want the
same pattern in `vinc-b2b`, plus a new server-rendered, paginated category page so deep
category URLs are crawlable for SEO.

## How vinc-b2c does it today (the pattern to copy)

| Layer                                                                              | Mechanism                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home page HTML                                                                     | `routeRules: { '/': { isr: 300 } }` — Nuxt ISR, 5 min                                                                                                                                                                                                                                                                                                                                                                                                                     |
| All other pages (`/[...slug]` → category / product / CMS page, `/search`, `/shop`) | plain SSR per request — **not** HTML-cached                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Upstream PIM data                                                                  | `defineCachedEventHandler` with `maxAge: 300, staleMaxAge: 3600`, keyed where needed: `site-config`, `home-config`, `menu` (by location), `category-landing` (by slug), `sitemap-data`; `pages/[slug]` uses a manual Redis-storage cache (preview bypass)                                                                                                                                                                                                                 |
| Cache backend                                                                      | Redis (`vinc-b2c:cache:{CACHE_TENANT}:…`), falls back to in-memory                                                                                                                                                                                                                                                                                                                                                                                                        |
| Invalidation                                                                       | **push.** On B2C storefront save/publish the PIM calls `getRedis().publish('vinc-b2c:cache-invalidate:{slug}', 'home-config,site-config')`. A Nitro plugin (`server/plugins/redis-cache-invalidation.ts`) subscribes, clears matching `nitro:handlers:{name}*` keys + `nitro:routes*`, then **re-warms** the affected routes via `$fetch` (REWARM_MAP) so no visitor hits a cold cache. `server/plugins/cache-warmer.ts` also warms core routes on startup + every 5 min. |
| CMS content pages                                                                  | served at **root-level slugs** (e.g. `/chi-siamo`) via the `/[...slug]` catch-all: try category → product → `usePageContent(slug)` (PIM `/api/pages/{slug}`) → 404.                                                                                                                                                                                                                                                                                                       |

**Net effect:** `/` is statically cached; everything else re-renders per request but reads
from warm 5-min data caches that the admin can flush on demand. Category/product/search
pages stay dynamic. `vinc-commerce-suite` already wires the publish→Redis side for **B2C only**;
the **B2B portal publish routes do nothing** today.

### Optional vinc-b2c improvements ("if something can be improved")

- Add `routeRules` `swr: 300` (or `isr`) for category & CMS-page URL patterns so the rendered
  HTML is cached too, not just the data. (Dynamic bits — cart count, login state — are already
  client-side, so this is safe.) Defer if risky.
- `staleMaxAge: 3600` on the cached handlers is mostly redundant given push-invalidation; harmless, leave it.

## Target for vinc-b2b

### B-1 — Cached PIM data + tags

Centralise PIM reads behind `unstable_cache`-wrapped functions (or `fetch(..., { next: { revalidate, tags } })`)
with **stable, tenant-scoped tags**, replacing the scattered `next: { revalidate: 300 }`:

| Helper                                                                                                | Tag(s)               | Used by                       |
| ----------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------- |
| `getHomeSettings` (`src/lib/home-settings/fetch-server.ts` — already has `home-settings-${tenantId}`) | `home-settings-${t}` | layout, footer, header        |
| home template / blocks fetch                                                                          | `home-template-${t}` | home page                     |
| menu tree fetch (`category/[[...slug]]` uses it)                                                      | `menu-${t}`          | header, category, breadcrumbs |
| categories / category-landing fetch                                                                   | `categories-${t}`    | category page, new SEO page   |
| sitemap fetch (`src/lib/pim/server-fetch.ts`, `revalidate: 3600`)                                     | `sitemap-${t}`       | sitemap.xml                   |
| CMS-page fetch (new — see B-3)                                                                        | `page-${t}-${slug}`  | new CMS-page route            |

Keep `revalidate: 300` as a TTL safety net; the real freshness comes from on-demand invalidation (B-2).

### B-2 — Push invalidation (mirror b2c)

- **PIM (`vinc-commerce-suite`):** on B2B portal PATCH (`/api/b2b/b2b/portals/[slug]`), B2B page publish
  (`…/pages/…/publish`) and B2B home-template publish (`…/home-template/publish`), publish to
  `vinc-b2b:cache-invalidate:{tenantId}` a comma list like `home-settings,home-template,menu,categories`
  (and `page:{slug}` for a specific page). Reuse the existing `getRedis()` helper / `src/lib/cache/redis-client.ts`.
- **vinc-b2b:** add `src/lib/cache/revalidation-subscriber.ts` started from `instrumentation.ts`
  (`register()` runs once per server process). It does `redis.psubscribe('vinc-b2b:cache-invalidate:*')`,
  parses `{tenantId from channel, names from message}`, maps names → tags, calls `revalidateTag(`${name}-${tenantId}`)`,
  then optionally re-fetches the hot pages (`/${defaultLocale}`, etc.) to pre-warm — Next's tag invalidation
  is lazy, so a `fetch` of the home URL repopulates the ISR cache (mirror of b2c's REWARM_MAP). No-op when `REDIS_HOST` unset.
- Also expose `POST /api/revalidate` (shared-secret header) calling `revalidateTag`/`revalidatePath` for manual/CI purges.

### B-3 — Page rendering modes

1. **Home** `src/app/[lang]/(default)/page.tsx` — ⚠️ this page calls `cookies()`
   (`PAGE_CONTEXT_COOKIE` → campaign / segment / region drives home-template _version_ selection)
   and reads home templates straight from **MongoDB** via `getPublishedHomeTemplate` (not `fetch`),
   so it is intrinsically dynamic — plain `revalidate` ISR is not possible while it does that.
   So **B-3.1 is "cache the data, keep the page dynamic"**, not "make the page ISR":
   - wrap `getPublishedHomeTemplate` / `getLatestHomeTemplateVersion` in `unstable_cache(fn, keyParts,
{ revalidate: 300, tags: ['home-template-${t}'] })` (keyed by the version-resolution tags it already
     takes as args), so the DB read is cached and `revalidateTag('home-template-${t}')` flushes it.
   - leave `dynamic = 'force-dynamic'` (or drop `revalidate = 0`/`fetchCache` and let `cookies()` force it).
   - _(b2c's `/` is `isr: 300` because its home isn't cookie-personalised; matching that would mean moving the
     cookie-based segment logic into a client component — out of scope, note as a possible follow-up.)_
2. **CMS / "static" pages** — vinc-b2b currently has _hardcoded_ React pages (`terms`, `privacy`,
   `about-us`, `faq`, `contact-us`, `elia`). To match b2c (root-level CMS slugs like `/chi-siamo`),
   add a catch-all `src/app/[lang]/[slug]/page.tsx` (single-segment, low priority) that fetches the
   portal page from PIM (`/api/b2b/b2b/public/pages/{slug}` — confirm endpoint), `export const revalidate = 300`,
   tagged `page-${t}-${slug}`, `notFound()` if no published page. The existing hardcoded routes stay and win
   (more specific segments beat the catch-all), so nothing breaks; new portal-managed pages "just work".
   _(If product wants the hardcoded ones migrated to portal pages, that's a follow-up.)_
3. **Category** `src/app/[lang]/category/[[...slug]]/page.tsx` — stays **dynamic** (per-request), but its
   menu/category fetch uses the `menu-${t}` / `categories-${t}` tagged cache instead of the bare `revalidate: 300`.
4. **NEW SEO category page** — make the server-rendered, paginated listing **the canonical category URL**
   (option chosen by the user). Concretely: rework `category/[[...slug]]/page.tsx` so the **first paint is full SSR**:
   - read `?page=N` (1-based), fetch that page of products for the category server-side (PIM search by category
     facet, fixed page size, e.g. 24), render the product grid in HTML.
   - emit SEO metadata in `generateMetadata`: `<link rel="canonical">` (page 1 = bare URL, page N = `?page=N`),
     `rel="prev"`/`rel="next"`, `CollectionPage` JSON-LD, breadcrumb JSON-LD (reuse the menu-path breadcrumb logic
     already in this route).
   - keep the existing interactive client filtering mounted on top (it hydrates over the SSR'd grid); deep
     filter state still uses the query string but the _crawlable_ surface is `/{lang}/category/{slug_path}?page=N`.
   - the product-list fetch itself is **per-request** (or `revalidate: 60`) — product availability/price is dynamic;
     b2c doesn't cache search either.
   - update breadcrumbs / `sitemap.xml` to point at these URLs (they already do for `/category/...`); make sure
     paginated pages beyond page 1 are either in the sitemap or at least reachable via `rel=next` so crawlers walk them.

### B-4 — Documentation deliverable

Add `vinc-b2c/CACHING.md` summarising the table above (the "clean the information" ask), and a short
`vinc-b2b/docs/CACHING.md` describing the mirrored setup once B-1/B-2 land.

## Out of scope / follow-ups

- Migrating vinc-b2b's hardcoded `terms`/`privacy`/etc. to portal-managed CMS pages.
- Caching product detail / search results (intentionally dynamic in both apps).
- Multi-portal support (one "default" portal per tenant assumed).

## Suggested phasing (separate commits)

1. **B-1 + B-4(b2c doc)** — tag the PIM fetches in vinc-b2b; write `vinc-b2c/CACHING.md`. Low risk.
2. **B-2** — PIM publish→Redis for B2B + vinc-b2b Redis subscriber + `/api/revalidate`. Touches both repos.
3. **B-3.1** — home page → ISR.
4. **B-3.2** — new SSR-paginated category page + metadata; (optionally B-3.3 the CMS `[slug]` catch-all).
5. **B-4(b2b doc)** + optional vinc-b2c `routeRules` improvement.

## Verification

- vinc-b2b: `npm run dev`; confirm `/` serves cached HTML (second load fast, `x-nextjs-cache: HIT`-ish), a
  category page renders products in `view-source` (not just a JS shell), `?page=2` SSRs page 2 with correct
  `rel=prev/next`/canonical, breadcrumb + CollectionPage JSON-LD validate (Rich Results Test).
- Invalidation: edit a B2B portal footer / publish a home template in the admin → within a second the change
  is live on vinc-b2b without a redeploy (watch the subscriber log + `revalidateTag` effect). `POST /api/revalidate`
  with the secret flushes a named tag.
- `pnpm test` (vitest) green in both repos; `tsc --noEmit` still OOMs (pre-existing) — rely on `npm run dev`.
- vinc-b2c: existing behaviour unchanged (only `CACHING.md` added unless the optional `routeRules` tweak is taken).
