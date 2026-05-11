# Caching — vinc-b2b (Next.js App Router)

Mirrors the vinc-b2c pattern (`vinc-b2c/CACHING.md`) in Next.js terms: upstream PIM
data is cached with **tenant-scoped tags**, **push-invalidated** by the PIM the moment
an admin publishes, and re-fetched fresh on the next request. Catalog / search / cart
pages stay dynamic.

## Layers

| What | How |
| --- | --- |
| Portal config (branding / header / footer / meta / scripts) | `fetch(..., { next: { revalidate: 300, tags: ['home-settings-${tenant}'] } })` in `src/lib/home-settings/fetch-server.ts` (and the `/api/b2b/home-settings` bridge route, which is `no-store`) |
| Home template (blocks + SEO) | direct MongoDB read wrapped in `unstable_cache(..., { revalidate: 300, tags: ['home-template-${tenant}'] })` — `getPublishedHomeTemplateCached` in `src/lib/db/home-templates.ts` (single-tenant only; multi-tenant reads live) |
| Menu / collections / products / sitemap | tagged `fetch` in `src/lib/pim/server-fetch.ts` / `src/lib/seo/fetch-product.ts` — tags `menu-…`, `collections-…`, `products-…`, `sitemap-…` |
| Tag names + tenant resolution | `src/lib/cache/tags.ts` — `CACHE_TAG_NAMES`, `cacheTag(name, tenantId, suffix?)`, `tagsForNames(names, tenantId)`, `currentTenantId()`, `SINGLE_TENANT_ID` |
| Home page (`[lang]/(default)/page.tsx`) | stays **dynamic** — it reads `cookies()` for delivery-address / campaign / segment / region context that picks the home-template version. The *data* is cached (above); the *render* isn't. (b2c's `/` is ISR because it isn't cookie-personalised.) |
| Category / search / product / cart | dynamic per request; their PIM data fetches still hit the tagged caches above |

`SINGLE_TENANT_ID` is `process.env.VINC_TENANT_ID`, falling back to the tenant slug parsed
from `API_KEY_ID` (`ak_{tenant}_{key}`), falling back to `"b2b"`.

## Invalidation — push, not TTL

```
admin publishes in vinc-commerce-suite
   (PATCH /api/b2b/b2b/portals/[slug], …/home-template/publish[-version], …/pages/[slug]/template/publish)
        ▼
PIM:  invalidateB2BCache(tenantId, names)  →  redis.publish(`vinc-b2b:cache-invalidate:{tenantId}`, names)
        ▼  (names e.g. "home-settings" | "home-template" | "page:chi-siamo,sitemap")
vinc-b2b:  src/lib/cache/revalidation-subscriber.ts  (started once per Node process from src/instrumentation.ts)
   - psubscribe `vinc-b2b:cache-invalidate:*`
   - tagsForNames(names, tenantIdFromChannel)  →  e.g. ['home-settings-acme']
   - revalidateTag(tag) for each  →  next request to a page using that tag re-fetches fresh
```

The `revalidate: 300` TTL is a fallback; freshness is driven by the publish events.

### Manual / CI purges — `POST /api/revalidate`
Shared secret in the `x-revalidate-secret` header (or `?secret=`); env `REVALIDATE_SECRET`.
Body / query: `tags: string[]` (verbatim), `names: string[]` + optional `tenantId` (mapped via `tags.ts`),
`paths: string[]`. Returns `{ revalidated, tags, paths }`.

## Env

```
REDIS_HOST=…           # unset → push invalidation disabled (TTL-only)
REDIS_PORT=6379
VINC_TENANT_ID=…       # optional explicit tenant id for cache-tag scoping (single-tenant)
REVALIDATE_SECRET=…    # required to use POST /api/revalidate
```

## Category pages (B-3.2)
- `/category/[[...slug]]` emits `BreadcrumbList` + `CollectionPage` JSON-LD (`CategoryJsonLd`)
  and reads the menu via the tagged `serverFetchPimMenu`.
- **Leaf** categories render a server-side, **paginated** product grid (`CategorySeoProducts`):
  `?page=N` is its own SSR page, `page>1` is self-canonical, `rel=prev/next`, products are in the
  HTML (image + name + link to the PDP). The client `CategoryPage` skips its products carousel there.
  Pagination is plain `<a>` navigation. Per-page size: `CATEGORY_PRODUCTS_PER_PAGE` (24).

### Follow-ups (see docs/superpowers/specs/2026-05-11-caching-and-seo-listing.md)
- Upgrade the leaf grid items to the full interactive product card / ERP prices, hydrated over
  the SSR markup (currently a lean image + name + link).
- Optional: a root-level `[slug]` CMS-page catch-all (portal-managed content pages, like b2c's
  `/chi-siamo`), with `revalidate` + `page-${tenant}-${slug}` tags.
