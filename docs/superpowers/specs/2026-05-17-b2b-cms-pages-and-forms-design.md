# B2B Dynamic CMS Pages & Inline Form Blocks

**Status:** Draft
**Date:** 2026-05-17
**Scope:** vinc-b2b (storefront). Zero changes in vinc-commerce-suite.

## Summary

Replace vinc-b2b's hardcoded "static" content routes (contact-us, about-us,
faq, privacy, terms, elia) with a single dynamic `[slug]` route that renders
pages authored in vinc-commerce-suite's B2B page builder. Add a `form-contact`
block renderer so admins can place forms inside those pages; submissions are
proxied to suite's existing public submit endpoint. Cache page fetches with
`unstable_cache` tagged `page-{tenant}-{slug}` so suite's existing
`invalidateB2BCache(tenantId, ['page:{slug}', 'sitemap'])` (already emitted on
publish) flushes the storefront within milliseconds.

## Motivation

- The B2B page builder in suite has been able to author multi-block pages
  (incl. inline contact forms) for months, but vinc-b2b has no route to render
  them — each "content" page is hand-coded JSX that admins can't edit.
- Suite already publishes cache-invalidation events to
  `vinc-b2b:cache-invalidate:{tenantId}` and vinc-b2b's subscriber already
  maps those to `revalidateTag()`. Page tags `page-{tenant}-{slug}` are
  declared but unused (no fetch references them yet).
- A single dynamic route closes the loop with no schema work, no new
  endpoints, and no new caching infrastructure.

## Non-goals

- Standalone form definitions (`b2bformdefinitions` collection,
  `form_type: "standalone"` submissions). Suite anticipates them but the page
  builder doesn't reference them, so they remain dead code for this iteration.
- A page-builder UI in vinc-b2b. Pages are authored in suite only.
- Migrating product-detail templates (those already use a separate
  `PageModel`/collection and don't need to change).

## Architecture

```
SUITE (admin)                                  vinc-b2b (storefront)
─────────────                                  ─────────────────────

B2B page builder
  └─ writes blocks to b2bhometemplates
     templateId = "b2b-default-page-{slug}"

On PUBLISH:
  pages/.../template/publish
   invalidateB2BCache(tid,
     ['page:{slug}', 'sitemap'])
                                  Redis ───►   subscriber (existing)
                                               ─► revalidateTag(page-{tid}-{slug})

                                              src/app/[lang]/(default)/[slug]/page.tsx ◄── NEW
                                                ├─ generateMetadata: from template SEO
                                                ├─ getCachedCmsPage(slug)
                                                │   └─ unstable_cache(load, {
                                                │        tags: ['page-{tid}-{slug}'] })
                                                │   └─ b2bhometemplates.findOne({
                                                │        templateId: 'b2b-default-page-{slug}',
                                                │        status: 'published' })
                                                └─ <CmsPageRenderer blocks lang/>   ◄── NEW
                                                     └─ case 'form-contact' →
                                                         <FormBlock config={inline}/>

                                              FormBlock (server)   ◄── NEW
                                                └─ <FormBlockClient definition={config}
                                                       blockId pageSlug/>

                                              FormBlockClient (client)   ◄── NEW
                                                └─ react-hook-form, POST /api/forms/submit

                                              /api/forms/submit (b2b route)   ◄── NEW
                                                ├─ injects x-api-key-id / x-api-secret
                                                ├─ forwards Origin
                                                └─ POSTs to suite:
                                                   /api/b2b/b2b/public/forms/submit
                                                   (already exists, form_type='page_form')

REMOVED in vinc-b2b:
  src/app/[lang]/(default)/{contact-us, about-us, faq, privacy, terms, elia}/
```

## Components

### New files

| Path                                        | Responsibility                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/db/models/b2b-home-template.ts`    | Mongoose model bound to collection `b2bhometemplates` (NOT the existing `pages` collection — that holds product-detail templates and stays untouched). Shape: `{ templateId, name, version, status, blocks[], seo, publishedAt, ... }` — only the fields the storefront reads. |
| `src/lib/db/cms-pages.ts`                   | `loadCmsPage(slug, tenantId)` raw fetch + `getCachedCmsPage(slug)` wrapping it in `unstable_cache` with tag `cacheTag('page', tenantId, slug)`.                                                                                                                                |
| `src/app/[lang]/(default)/[slug]/page.tsx`  | Server component. Resolves tenant, calls `getCachedCmsPage(slug)`, `notFound()` on miss, exports `generateMetadata` from `template.seo`, renders `<CmsPageRenderer>`.                                                                                                          |
| `src/components/blocks/CmsPageRenderer.tsx` | Pure dispatcher. Maps `block.type` → existing block component (richText, customHtml, mediaImage, youtubeEmbed, hero family, etc.) plus the new `form-contact` case. Unknown types: dev-only warning, prod silent skip (consistent with `BlockRenderer.tsx`).                   |
| `src/components/blocks/FormBlock.tsx`       | Thin server wrapper around `<FormBlockClient>`. Receives `FormBlockConfig`, `blockId`, `pageSlug`.                                                                                                                                                                             |
| `src/components/blocks/FormBlockClient.tsx` | `'use client'`. `react-hook-form` form. Renders one input per `field.type` (text, email, textarea, select, checkbox, number, date). Submits via fetch to `/api/forms/submit`. Shows `success_message` on success, error message inline on failure.                             |
| `src/app/api/forms/submit/route.ts`         | POST handler. Body `{ pageSlug, formBlockId, data }`. Reads `VINC_SUITE_API_KEY_ID` + `VINC_SUITE_API_SECRET` env. Forwards to `${VINC_SUITE_API_BASE}/api/b2b/b2b/public/forms/submit` with those headers and `Origin: req.headers.host`. Returns suite response verbatim.    |

### Edited files

| Path                                                            | Change                                                            |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/components/blocks/BlockRenderer.tsx`                       | Add `if (blockType === 'form-contact') return <FormBlock ... />`. |
| `src/components/blocks/HomeBlockRenderer.tsx`                   | Same case.                                                        |
| `src/components/themes/default/home/default-block-renderer.tsx` | Same case.                                                        |
| `src/components/themes/time/home/time-block-renderer.tsx`       | Same case.                                                        |

### Deleted folders

| Path                                   | Reason                      |
| -------------------------------------- | --------------------------- |
| `src/app/[lang]/(default)/contact-us/` | Replaced by `[slug]` route. |
| `src/app/[lang]/(default)/about-us/`   | Same.                       |
| `src/app/[lang]/(default)/faq/`        | Same.                       |
| `src/app/[lang]/(default)/privacy/`    | Same.                       |
| `src/app/[lang]/(default)/terms/`      | Same.                       |
| `src/app/[lang]/(default)/elia/`       | Same.                       |

`account/`, `checkout/`, `complete-order/`, `products/`, `collections/`,
`search/`, `product-compare/` are NOT touched — they keep their typed routes.
Next.js gives priority to typed segments over dynamic, so `[slug]` only
catches what's left.

## Data flow

### Render path

1. Browser → `https://{portal-domain}/{lang}/{slug}`.
2. `[lang]/(default)/[slug]/page.tsx` runs server-side.
3. `currentTenantId()` (existing `src/lib/cache/tags.ts`) resolves tenant from
   hostname (multi-tenant) or env (single-tenant).
4. `getCachedCmsPage(slug)` is called. Cache key includes both the slug and the
   tenant (inside the tag); cache hit returns immediately, miss runs the loader.
5. Loader connects to the tenant DB (`vinc-{tenantId}`) and queries
   `b2bhometemplates.findOne({ templateId: \`b2b-default-page-${slug}\`,
   status: 'published' })`.
6. On miss → loader returns `null` → page calls `notFound()`.
7. On hit → `<CmsPageRenderer blocks={template.blocks} lang={lang} />` renders
   each block.
8. `generateMetadata` uses the same cached fetch (Next dedupes within the
   request) and pulls title/description/og fields from `template.seo`.

### Submit path

1. User fills `<FormBlockClient>` and clicks submit.
2. Client `fetch('/api/forms/submit', { method: 'POST', body: JSON.stringify({
pageSlug, formBlockId, data }) })`.
3. vinc-b2b route handler builds outbound request:
   - URL: `${VINC_SUITE_API_BASE}/api/b2b/b2b/public/forms/submit`
   - Headers: `x-api-key-id`, `x-api-secret`, `Origin: https://{req-host}`,
     `Content-Type: application/json`
   - Body: `{ page_slug, form_block_id, data }` (snake_case to match suite)
4. Suite handler (existing, unchanged):
   - Verifies API key → resolves `tenantDb` and `tenantId`.
   - Resolves portal by Origin domain.
   - Fetches published page template, finds the block by id, validates fields.
   - Inserts into `b2bformsubmissions` with `form_type: 'page_form'`.
   - Fire-and-forget notification email if `config.notification_email` set.
   - Returns `{ success: true, message }`.
5. vinc-b2b route returns the response verbatim.
6. Client shows `success_message` on `success: true`, or the `error` field
   inline on failure.

### Cache invalidation

No new invalidation work. Existing flow:

1. Admin publishes a page in suite.
2. `pages/[pageSlug]/template/publish` route calls
   `invalidateB2BCache(tid, ['page:{slug}', 'sitemap'])`.
3. Redis PUBLISH `vinc-b2b:cache-invalidate:{tid}` = `"page:faq,sitemap"`.
4. vinc-b2b subscriber (`src/lib/cache/revalidation-subscriber.ts`) reads it,
   maps to `[page-{tid}-{slug}, sitemap-{tid}]`, calls `revalidateTag()`.
5. Next request for `/{lang}/{slug}` rebuilds from the loader.

When `REDIS_HOST` is unset (small deployments), the storefront falls back to
the per-tag TTL revalidation that `unstable_cache` provides by default — set
`revalidate: 300` (5 min, matching `src/lib/pim/server-fetch.ts`) inside
`getCachedCmsPage` as a safety net.

## Block type coverage

`CmsPageRenderer` must handle every block type suite's page builder emits.
Suite stores block types as `{family}-{variant}` (e.g. `content-custom-html`).
Existing `BlockRenderer.tsx` and `HomeBlockRenderer.tsx` accept both the
family-prefixed form and a short alias (e.g. `'richText' || 'content-rich-text'`)
for legacy reasons. `CmsPageRenderer` does the same.

| Suite-emitted type                                | Short alias accepted                                        | vinc-b2b component                                                                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content-custom-html`                             | `customHTML`                                                | reuse `CustomHTMLBlock`                                                                                                                                                |
| `content-rich-text`                               | `richText`                                                  | reuse `RichTextBlock`                                                                                                                                                  |
| `media-image`                                     | —                                                           | reuse `MediaImageBlock`                                                                                                                                                |
| `media-youtube`                                   | `youtubeEmbed`                                              | reuse `YouTubeEmbedBlock`                                                                                                                                              |
| `form-contact`                                    | —                                                           | NEW `FormBlock`                                                                                                                                                        |
| `productDetail-dataTable`                         | `product-data-table`, `productDataTable`, `attribute-table` | reuse `ProductDataTableBlock`                                                                                                                                          |
| `hero-*`, `product-*`, `category-*`, `carousel-*` | (varies)                                                    | reuse the component used by `HomeBlockRenderer.tsx` (and theme variants) for the same type. `CmsPageRenderer` imports them; it does **not** re-implement render logic. |

Unknown types: dev-only yellow warning box, prod silent skip (mirrors
`BlockRenderer.tsx:81-91`).

If a hero/product block component currently expects props from the home page
context (e.g. `lang`, `region`), `CmsPageRenderer` passes the same shape so
the components don't need branching.

## Form field types

`FormBlockClient` supports the types declared in suite's `FormFieldConfig`:

- `text`, `email`, `tel`, `url`, `number` → `<input>` with matching `type`.
- `textarea` → `<textarea>`.
- `select` → `<select>` with `field.options`.
- `checkbox` → single boolean toggle.
- `date` → `<input type="date">`.

Validation: `required` → `react-hook-form` `required` rule. `email` →
HTML `type="email"` + `pattern`. No client-side enforcement of `min`/`max` etc.
beyond what suite expects; suite re-validates on submit and is the source of
truth.

## Errors & edge cases

- Page slug not in DB → `notFound()`.
- Page in DB but draft → `notFound()` (status filter on the query).
- Tenant unresolved → existing `tenant-error` route.
- Suite submit returns 4xx → surface `error` field inline; keep form values.
- Suite submit network error → "Errore di invio, riprova." inline; keep
  values.
- API key env vars missing → `/api/forms/submit` returns 503 with
  `{ error: 'Submit credentials not configured' }`. Deployment fails loudly,
  not silently.
- Static segment collision: Next.js prioritises typed routes, so existing
  pages keep working. Slug clashes only occur if an admin creates a
  `b2bpages` entry with a reserved slug (`account`, `checkout`, etc.); we
  guard at admin level later, not in this iteration.

## Environment variables (new)

| Var                     | Required | Purpose                                                                 |
| ----------------------- | -------- | ----------------------------------------------------------------------- |
| `VINC_SUITE_API_BASE`   | yes      | Base URL of vinc-commerce-suite (e.g. `https://suite.your-domain.com`). |
| `VINC_SUITE_API_KEY_ID` | yes      | API key id for tenant-scoped public form submit.                        |
| `VINC_SUITE_API_SECRET` | yes      | Matching secret.                                                        |

Document them in `.env.example` and `.env.deploy.multi`.

## Testing

| Layer       | What                                                                                                                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | `CmsPageRenderer` against fixtures for each block type incl. unknown.                                                                                                                                                                                                       |
| Unit        | `FormBlockClient` renders each field type from a fixture config; required-field validation triggers on submit.                                                                                                                                                              |
| Integration | `/api/forms/submit` mocks fetch to suite; asserts headers (`x-api-key-id`, `Origin`), body translation (`pageSlug` → `page_slug`), and response forwarding.                                                                                                                 |
| Integration | `cms-pages.ts` against a fixture document in test Mongo; verify `unstable_cache` tag is set (mock `next/cache.unstable_cache` and assert options).                                                                                                                          |
| Manual E2E  | On a staging tenant: author a page with a `form-contact` block in suite, publish, visit the storefront URL, confirm form renders within seconds (push invalidation), submit, verify row in `b2bformsubmissions` (`form_type: 'page_form'`) and notification email delivery. |

## Out-of-scope follow-ups

- Wire `b2bformdefinitions` references (path B) once an admin UI flow needs
  reusable forms.
- Sitemap generation should read from `b2bpages` so suite-authored pages
  appear in `/sitemap.xml` (existing `sitemap` cache tag is already
  invalidated on publish, so the data plumbing is half-done).
- Admin-level slug guard against reserved storefront routes.

## Open questions

None at the time of writing; resolve in plan if any surface.
