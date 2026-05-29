# vinc-erp

Server-side, framework-free ERP client for VINC applications.

- `ErpClient` — provider-agnostic interface. The contract every ERP integration implements.
- `MyMbErpClient` — first implementation; talks to the MYMB ERP webservice over HTTP with Basic auth. A faithful TypeScript port of the legacy `ErpClient.py`.

Caching and configuration are **injected** (see `CacheAdapter` and `MyMbErpSettings`) so the package has zero runtime dependencies and never reaches the browser.

## Adding a new ERP provider

1. Add canonical DTOs to `src/types/` if the provider needs new shapes.
2. Create `src/<provider>/<provider>-erp-client.ts` implementing `ErpClient`.
3. Export it from `src/index.ts`.
Consumers select an implementation; routes and DTOs stay unchanged.
