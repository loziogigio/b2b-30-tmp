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

## Project Overview

This is a Next.js 15 B2B e-commerce application with:

- Multi-language support (i18n)
- Dynamic page building
- Product catalog with PIM integration
- Shopping cart and checkout
- Customer account management

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
- `NEXT_PUBLIC_PROJECT_CODE` - Tenant ID (e.g., vinc-hidros-it)
- `NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT` - Public B2B API endpoint
