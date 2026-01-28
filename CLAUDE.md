# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

**NEVER run `npm run build` or `pnpm build`** - The build process is slow and resource-intensive. The user will run builds manually when needed.

## Development

- Use `pnpm dev` for development - The dev server handles hot reload and is sufficient for testing changes.
- Use `pnpm format` to fix formatting issues before commits.

## Type Checking

If you need to verify types, use `npx tsc --noEmit` on specific files only, not the whole project:

```bash
npx tsc --noEmit src/path/to/file.ts
```

## Commits

When committing changes:

- Use `--no-verify` flag if pre-existing lint errors block the commit
- **NEVER include `Co-Authored-By:` lines** in commit messages
- **NEVER include `🤖 Generated with [Claude Code]` lines** in commit messages

## Documentation

- **NEVER use specific company/tenant names** (e.g., hidros, dfl-eventi) in documentation files
- Use generic placeholders instead: `your-tenant-id`, `tenant-a`, `your-domain.com`, etc.
- This keeps documentation reusable across different deployments

## Project Overview

This is a Next.js 15 B2B e-commerce application with:

- Multi-language support (i18n)
- Dynamic page building
- Product catalog with PIM integration
- Shopping cart and checkout
- Customer account management

## Core Coding Principles

**These principles are mandatory for all code changes:**

1. **Clean Code** - Easy to read and understand
2. **Reusability** - No code duplication (DRY principle)
3. **No Hardcoding** - Use parameters, configs, or route params instead of hardcoded values

## Key Directories

- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components
- `src/framework/basic-rest/` - API abstraction layer with React Query
- `src/lib/vinc-api/` - VINC API client for internal service calls
- `src/contexts/` - React Context providers
- `src/utils/` - Helper functions

## Environment Variables

Key variables are in `.env`:

- `VINC_API_URL` - VINC API base URL
- `VINC_INTERNAL_API_KEY` - API key for internal calls
- `NEXT_PUBLIC_PROJECT_CODE` - Tenant ID (e.g., vinc-your-tenant-id) - **only for single-tenant mode**
- `NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT` - Public B2B API endpoint

## Multi-Tenant Architecture

In multi-tenant mode (`TENANT_MODE=multi`):

- **Tenant detection**: Hostname → MongoDB tenant registry → tenant config
- **Project code**: Comes from `tenant.projectCode` in DB, NOT from `NEXT_PUBLIC_PROJECT_CODE` env var
- **TenantContext**: Use `useTenantOptional()` or `useTenant()` to access tenant info client-side
- **ERP_STATIC**: Global state for customer context (customer_code, address_code, project_code)

### Likes/Reminders User ID Format

```text
{project_code}-{customer_code}-{address_code}
```

- `project_code`: From `ERP_STATIC.project_code` (set from TenantContext)
- `customer_code`: From SSO profile (`customers[0].erp_customer_id`)
- `address_code`: From SSO profile (`customers[0].addresses[0].erp_address_id`)

### Key Files for Multi-Tenant

- `src/lib/tenant/service.ts` - Tenant resolution from hostname
- `src/contexts/tenant.context.tsx` - TenantContext and hooks
- `src/framework/basic-rest/utils/static.ts` - ERP_STATIC state management
- `src/components/common/erp-hydrator.tsx` - Hydrates ERP_STATIC from localStorage/SSO

## Testing

See [src/test/TESTING_STANDARDS.md](src/test/TESTING_STANDARDS.md) for comprehensive testing standards.

### Quick Reference

```bash
pnpm test              # Run all tests
pnpm test push         # Run specific file
pnpm test --watch      # Watch mode
pnpm test --coverage   # With coverage
```

### Test Structure

```text
src/test/
  TESTING_STANDARDS.md  # Full testing documentation
  setup.ts              # Vitest global setup
  conftest.ts           # Shared fixtures & factories
  unit/                 # Unit tests
  api/                  # Integration tests
  hooks/                # Hook tests
  components/           # Component tests
```
