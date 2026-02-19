# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Rules

- **NEVER run `npm run build` or `pnpm build`** — slow and resource-intensive; the user runs builds manually
- **NEVER include `Co-Authored-By:` lines** in commit messages
- **NEVER include `Generated with [Claude Code]` lines** in commit messages
- **NEVER use specific company/tenant names** (e.g., hidros, dfl-eventi) in documentation — use generic placeholders (`your-tenant-id`, `tenant-a`, `your-domain.com`)
- Use `--no-verify` flag if pre-existing lint errors block a commit

## Development

```bash
pnpm dev              # Dev server with hot reload (sufficient for testing)
pnpm format           # Fix formatting before commits
pnpm test             # Run all tests
pnpm test --watch     # Watch mode
```

Type-check specific files only (never the whole project):

```bash
npx tsc --noEmit src/path/to/file.ts
```

## Coding Principles

1. **Clean Code** — easy to read and understand
2. **Reusability** — no code duplication (DRY)
3. **No Hardcoding** — use parameters, configs, or route params

## Project Overview

Next.js 16 B2B e-commerce application with multi-language i18n, dynamic page building, PIM product catalog, shopping cart/checkout, and customer account management.

### Key Directories

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components
- `src/framework/basic-rest/` — API abstraction layer with React Query
- `src/lib/vinc-api/` — VINC API client for internal service calls
- `src/contexts/` — React Context providers
- `src/utils/` — Helper functions

### Shared Packages

- `vinc-pim` — PIM types and interfaces (`PimProduct`, `PimSearchResponse`)

## Modal System

Stack-based modal with three variants (`src/components/common/modal/`):

- **`center`** (default) — scale-in animation, used for auth forms, addresses, etc.
- **`bottom`** — slide-up, used for category popup
- **`fullscreen`** — slide-from-right, full viewport panel, used for product popup and variants quick view

Modal stack supports push/pop: opening a product from the variants view pushes onto the stack; closing returns to the variants view.

### Key Files

- `modal.tsx` — Headless UI Dialog wrapper with variant animations
- `modal.context.tsx` — Stack-based state (`openModal`/`closeModal`/`closeAll`/`goBack`)
- `managed-modal.tsx` — Routes `view` to the correct component and modal variant

## Product Variants Architecture

### Variant Display (3 patterns)

1. **Fullscreen modal** (`B2BProductVariantsQuickView`) — triggered from product cards in search results
2. **Inline on product detail page** (`ProductB2BDetails`) — when navigating to a parent product URL
3. **Expandable rows** (`ProductRowB2B`) — inline variant table in list view

All three use `B2BVariantsGridContent` as the shared component (`src/components/product/b2b-variants-grid-content.tsx`):

- Parent product header (image + SKU + brand + name + description)
- Filter/sort controls (text search, sort dropdown, model tag chips)
- Responsive card grid with infinite scroll ERP price loading
- `useWindowScroll` prop: `false` for modal (contained scroll), `true` for page (viewport scroll)

### PIM Product Fetching

- `usePimProductListQuery` with `groupByParent: true` returns products with inline `variations[]`
- Product detail page fallback: if SKU search returns no results, searches by `parent_sku` to find children
- `transformPimProduct()` maps PIM API response: `raw.variants` → `variations`, `raw.entity_code` → `id`

### Variant Detection Logic

```typescript
const hasVariants =
  (product.variantCount && product.variantCount > 1) || variations.length > 1;
```

- Multi-variant parent → opens `B2B_PRODUCT_VARIANTS_QUICK_VIEW` modal
- Single variant or simple product → opens `PRODUCT_VIEW` modal

## Multi-Tenant Architecture

In multi-tenant mode (`TENANT_MODE=multi`):

- **Tenant detection**: Hostname → MongoDB tenant registry → tenant config
- **Project code**: From `tenant.projectCode` in DB, NOT from `NEXT_PUBLIC_PROJECT_CODE`
- **TenantContext**: `useTenantOptional()` or `useTenant()` for client-side access
- **ERP_STATIC**: Global state for customer context (customer_code, address_code, project_code)

### Likes/Reminders User ID Format

```text
{project_code}-{customer_code}-{address_code}
```

### Key Files

- `src/lib/tenant/service.ts` — Tenant resolution from hostname
- `src/contexts/tenant.context.tsx` — TenantContext and hooks
- `src/framework/basic-rest/utils/static.ts` — ERP_STATIC state management
- `src/components/common/erp-hydrator.tsx` — Hydrates ERP_STATIC from localStorage/SSO

## Environment Variables

Key variables in `.env`:

- `VINC_API_URL` — VINC API base URL
- `VINC_INTERNAL_API_KEY` — API key for internal calls
- `NEXT_PUBLIC_PROJECT_CODE` — Tenant ID (single-tenant mode only)
- `NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT` — Public B2B API endpoint

## Testing

See [src/test/TESTING_STANDARDS.md](src/test/TESTING_STANDARDS.md) for comprehensive testing standards.

```text
src/test/
  setup.ts              # Vitest global setup
  conftest.ts           # Shared fixtures & factories
  unit/                 # Unit tests
  api/                  # Integration tests
  hooks/                # Hook tests
  components/           # Component tests
```
