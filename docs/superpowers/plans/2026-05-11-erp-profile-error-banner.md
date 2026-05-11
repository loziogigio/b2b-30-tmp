# ERP / B2B Profile Error Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a persistent, non-dismissible top banner telling a logged-in B2B user there's a problem with their account profile and to contact the tenant, whenever their ERP/B2B calls fail.

**Architecture:** A module-level pub/sub store (`erp-health`) tracks an `unhealthy` flag. An axios response interceptor on both HTTP clients (`httpB2B`, `httpPIM`) flips it on a `4xx/5xx` (not `401`) for customer-context endpoints (`/erp/...`, `/b2b/cart...`) while the user is authorized, and clears it on any successful customer-context call. A `<ErpHealthBanner>` mounted in the `[lang]` layout subscribes via `useSyncExternalStore` and renders the warning bar.

**Tech Stack:** Next.js 16 (App Router), React 19 (`useSyncExternalStore`), TypeScript, axios, react-i18next, Vitest + Testing Library.

---

## File Structure

| File                                                      | Responsibility                                                                                                         | New/Modify |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| `src/framework/basic-rest/erp/erp-health.ts`              | Module-level health store + `useErpHealth()` hook                                                                      | **New**    |
| `src/framework/basic-rest/erp/erp-health-interceptor.ts`  | Pure `evaluateErpResponse()` helper + `addErpHealthInterceptor(axios)`                                                 | **New**    |
| `src/framework/basic-rest/utils/httpB2B.ts`               | Wire `addErpHealthInterceptor` into the B2B axios instance                                                             | Modify     |
| `src/framework/basic-rest/utils/httpPIM.ts`               | Wire `addErpHealthInterceptor` into the PIM axios instance                                                             | Modify     |
| `src/components/common/erp-health-banner.tsx`             | The banner UI component (client)                                                                                       | **New**    |
| `src/app/[lang]/layout.tsx`                               | Mount `<ErpHealthBanner lang={lang} />` above `{children}`                                                             | Modify     |
| `src/lib/tenant/types.ts`                                 | Optional `supportContact` on `TenantConfig` & `TenantPublicInfo`; thread through `toPublicInfo` + `buildTenantFromEnv` | Modify     |
| `src/lib/tenant/service.ts`                               | Read `support_contact` from the Mongo doc in `fromDocument()`                                                          | Modify     |
| `src/app/i18n/locales/{en,it,de,es,ar,he,zh}/common.json` | 3 new keys per locale                                                                                                  | Modify     |
| `src/test/unit/erp-health.test.ts`                        | Tests for the store                                                                                                    | **New**    |
| `src/test/unit/erp-health-interceptor.test.ts`            | Tests for `evaluateErpResponse`                                                                                        | **New**    |
| `src/test/components/erp-health-banner.test.tsx`          | Tests for the banner component                                                                                         | **New**    |

> Note vs. spec: the interceptor lives in `src/framework/basic-rest/erp/` (next to the store) rather than `src/lib/auth/`, because it depends on `ERP_STATIC` (`@framework/utils/static`) and the store — both already in `framework`. This avoids any import cycle through `lib/auth`.

---

## Task 1: Tenant config — optional `supportContact`

**Files:**

- Modify: `src/lib/tenant/types.ts`
- Modify: `src/lib/tenant/service.ts`

- [ ] **Step 1: Add `supportContact` to `TenantConfig`**

In `src/lib/tenant/types.ts`, inside `interface TenantConfig`, add the field right after `b2bTheme?: string;`:

```typescript
  /** B2B storefront theme (e.g., "default", "time") */
  b2bTheme?: string;
  /** Support contact shown to users when their ERP/B2B profile is broken
   *  (email, phone, or URL). Optional. */
  supportContact?: string;
```

- [ ] **Step 2: Add `supportContact` to `TenantPublicInfo` and `toPublicInfo`**

In the same file, inside `interface TenantPublicInfo`, add after `b2bTheme?: string;`:

```typescript
  b2bTheme?: string;
  supportContact?: string;
```

And in `toPublicInfo()`, add the field to the returned object after `b2bTheme: tenant.b2bTheme,`:

```typescript
    b2bTheme: tenant.b2bTheme,
    supportContact: tenant.supportContact,
```

- [ ] **Step 3: Populate from env in `buildTenantFromEnv`**

In `buildTenantFromEnv()`, add after `b2bTheme: process.env.B2B_THEME || 'default',`:

```typescript
    b2bTheme: process.env.B2B_THEME || 'default',
    supportContact: process.env.NEXT_PUBLIC_SUPPORT_CONTACT || undefined,
```

- [ ] **Step 4: Read `support_contact` from the Mongo doc**

In `src/lib/tenant/service.ts`:

a) In `interface TenantDocument`, add after `b2b_theme?: string;`:

```typescript
  b2b_theme?: string;
  support_contact?: string;
```

b) In `fromDocument()`, add after `b2bTheme: doc.b2b_theme || 'default',`:

```typescript
    b2bTheme: doc.b2b_theme || 'default',
    supportContact: doc.support_contact,
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit src/lib/tenant/types.ts src/lib/tenant/service.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tenant/types.ts src/lib/tenant/service.ts
git commit -m "feat(tenant): add optional supportContact to tenant config"
```

---

## Task 2: `erp-health` store + `useErpHealth` hook

**Files:**

- Create: `src/framework/basic-rest/erp/erp-health.ts`
- Test: `src/test/unit/erp-health.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/unit/erp-health.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  reportErpFailure,
  reportErpSuccess,
  getErpHealthSnapshot,
  subscribeErpHealth,
} from '@framework/erp/erp-health';

describe('erp-health store', () => {
  beforeEach(() => {
    // reset to healthy before each test
    reportErpSuccess();
  });

  it('starts healthy', () => {
    expect(getErpHealthSnapshot()).toBe(false);
  });

  it('reportErpFailure flips to unhealthy', () => {
    reportErpFailure();
    expect(getErpHealthSnapshot()).toBe(true);
  });

  it('reportErpSuccess flips back to healthy', () => {
    reportErpFailure();
    reportErpSuccess();
    expect(getErpHealthSnapshot()).toBe(false);
  });

  it('notifies subscribers on state change', () => {
    const listener = vi.fn();
    const unsub = subscribeErpHealth(listener);
    reportErpFailure();
    expect(listener).toHaveBeenCalledTimes(1);
    reportErpSuccess();
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
  });

  it('does not over-notify on idempotent calls', () => {
    const listener = vi.fn();
    const unsub = subscribeErpHealth(listener);
    reportErpFailure();
    reportErpFailure();
    expect(listener).toHaveBeenCalledTimes(1);
    reportErpSuccess();
    reportErpSuccess();
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsub = subscribeErpHealth(listener);
    unsub();
    reportErpFailure();
    expect(listener).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/erp-health.test.ts`
Expected: FAIL — cannot resolve `@framework/erp/erp-health`.

- [ ] **Step 3: Write the store**

Create `src/framework/basic-rest/erp/erp-health.ts`:

```typescript
'use client';

import { useSyncExternalStore } from 'react';

/**
 * Global "is the user's ERP/B2B profile working" flag.
 *
 * Lives outside React because it is updated from an axios interceptor.
 * `true` means recent customer-context calls (prices, cart) are failing —
 * the UI should warn the user to contact the shop.
 */
let unhealthy = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

/** Mark the ERP/B2B profile as broken. Idempotent. */
export function reportErpFailure(): void {
  if (unhealthy) return;
  unhealthy = true;
  emit();
}

/** Mark the ERP/B2B profile as healthy again. Idempotent. */
export function reportErpSuccess(): void {
  if (!unhealthy) return;
  unhealthy = false;
  emit();
}

/** Current value (used by `useSyncExternalStore` and tests). */
export function getErpHealthSnapshot(): boolean {
  return unhealthy;
}

/** Subscribe to changes. Returns an unsubscribe function. */
export function subscribeErpHealth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Server snapshot — always healthy so the banner never renders on SSR. */
function getServerSnapshot(): boolean {
  return false;
}

/** React hook: `{ unhealthy }`. */
export function useErpHealth(): { unhealthy: boolean } {
  const value = useSyncExternalStore(
    subscribeErpHealth,
    getErpHealthSnapshot,
    getServerSnapshot,
  );
  return { unhealthy: value };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/unit/erp-health.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/framework/basic-rest/erp/erp-health.ts src/test/unit/erp-health.test.ts
git commit -m "feat(erp): add erp-health store and useErpHealth hook"
```

---

## Task 3: `evaluateErpResponse` helper + `addErpHealthInterceptor`

**Files:**

- Create: `src/framework/basic-rest/erp/erp-health-interceptor.ts`
- Test: `src/test/unit/erp-health-interceptor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/unit/erp-health-interceptor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  isCustomerContextUrl,
  evaluateErpResponse,
} from '@framework/erp/erp-health-interceptor';

describe('isCustomerContextUrl', () => {
  it('matches /erp/ paths', () => {
    expect(isCustomerContextUrl('/erp/get_multiple_prices')).toBe(true);
    expect(
      isCustomerContextUrl(
        'https://b2b.example.com/api/v1/erp/get_multiple_prices',
      ),
    ).toBe(true);
  });

  it('matches /b2b/cart paths', () => {
    expect(isCustomerContextUrl('/api/b2b/cart/active')).toBe(true);
    expect(isCustomerContextUrl('/api/b2b/cart/order/123')).toBe(true);
  });

  it('does not match unrelated paths', () => {
    expect(isCustomerContextUrl('/api/search/search')).toBe(false);
    expect(isCustomerContextUrl('/api/public/menu')).toBe(false);
    expect(isCustomerContextUrl(undefined)).toBe(false);
  });
});

describe('evaluateErpResponse', () => {
  it('500 on /erp/ while authorized → failure', () => {
    expect(
      evaluateErpResponse({
        status: 500,
        url: '/erp/get_multiple_prices',
        authorized: true,
        isError: true,
      }),
    ).toBe('failure');
  });

  it('400 on /b2b/cart while authorized → failure', () => {
    expect(
      evaluateErpResponse({
        status: 400,
        url: '/api/b2b/cart/active',
        authorized: true,
        isError: true,
      }),
    ).toBe('failure');
  });

  it('401 on /erp/ → ignore (handled by auth interceptor)', () => {
    expect(
      evaluateErpResponse({
        status: 401,
        url: '/erp/get_multiple_prices',
        authorized: true,
        isError: true,
      }),
    ).toBe('ignore');
  });

  it('500 on /erp/ while NOT authorized → ignore', () => {
    expect(
      evaluateErpResponse({
        status: 500,
        url: '/erp/get_multiple_prices',
        authorized: false,
        isError: true,
      }),
    ).toBe('ignore');
  });

  it('network error (no status) on /erp/ → ignore', () => {
    expect(
      evaluateErpResponse({
        status: undefined,
        url: '/erp/get_multiple_prices',
        authorized: true,
        isError: true,
      }),
    ).toBe('ignore');
  });

  it('500 on unrelated url → ignore', () => {
    expect(
      evaluateErpResponse({
        status: 500,
        url: '/api/search/search',
        authorized: true,
        isError: true,
      }),
    ).toBe('ignore');
  });

  it('200 on /b2b/cart → success', () => {
    expect(
      evaluateErpResponse({
        status: 200,
        url: '/api/b2b/cart/active',
        authorized: true,
        isError: false,
      }),
    ).toBe('success');
  });

  it('200 on unrelated url → ignore', () => {
    expect(
      evaluateErpResponse({
        status: 200,
        url: '/api/public/menu',
        authorized: true,
        isError: false,
      }),
    ).toBe('ignore');
  });

  it('3xx success-side response on /erp/ → ignore', () => {
    expect(
      evaluateErpResponse({
        status: 304,
        url: '/erp/get_multiple_prices',
        authorized: true,
        isError: false,
      }),
    ).toBe('ignore');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/erp-health-interceptor.test.ts`
Expected: FAIL — cannot resolve `@framework/erp/erp-health-interceptor`.

- [ ] **Step 3: Write the interceptor module**

Create `src/framework/basic-rest/erp/erp-health-interceptor.ts`:

```typescript
import type { AxiosError, AxiosInstance } from 'axios';
import { reportErpFailure, reportErpSuccess } from './erp-health';
import { ERP_STATIC } from '@framework/utils/static';

/**
 * URLs that depend on the customer's ERP profile. A 4xx/5xx on one of these
 * for a logged-in user means their account is misconfigured server-side.
 * Covers `/erp/get_multiple_prices` and `/api/b2b/cart/...`.
 */
const CUSTOMER_CONTEXT_URL = /(\/erp\/|\/b2b\/cart)/i;

export function isCustomerContextUrl(url?: string): boolean {
  if (!url) return false;
  return CUSTOMER_CONTEXT_URL.test(url);
}

export type ErpHealthVerdict = 'failure' | 'success' | 'ignore';

/**
 * Pure decision function — given a response/error's status, url, whether the
 * user is authorized, and whether this is the error branch, decide what to do.
 */
export function evaluateErpResponse(input: {
  status?: number;
  url?: string;
  authorized: boolean;
  isError: boolean;
}): ErpHealthVerdict {
  const { status, url, authorized, isError } = input;
  if (!isCustomerContextUrl(url)) return 'ignore';

  if (!isError) {
    return status != null && status >= 200 && status < 300
      ? 'success'
      : 'ignore';
  }

  // error branch
  if (!authorized) return 'ignore';
  if (status == null) return 'ignore'; // network / timeout — not a profile issue
  if (status === 401) return 'ignore'; // handled by the auth/refresh interceptor
  if (status >= 400 && status <= 599) return 'failure';
  return 'ignore';
}

function isAuthorized(): boolean {
  return !!ERP_STATIC.customer_code;
}

/**
 * Attach the ERP-health response interceptor to an axios instance.
 * Never throws on its own; always re-throws the original error.
 */
export function addErpHealthInterceptor(http: AxiosInstance): void {
  http.interceptors.response.use(
    (response) => {
      if (typeof window !== 'undefined') {
        try {
          const verdict = evaluateErpResponse({
            status: response.status,
            url: response.config?.url,
            authorized: isAuthorized(),
            isError: false,
          });
          if (verdict === 'success') reportErpSuccess();
        } catch {
          // health logic must never break a successful response
        }
      }
      return response;
    },
    (error: AxiosError) => {
      if (typeof window !== 'undefined') {
        try {
          const verdict = evaluateErpResponse({
            status: error.response?.status,
            url: error.config?.url,
            authorized: isAuthorized(),
            isError: true,
          });
          if (verdict === 'failure') reportErpFailure();
        } catch {
          // ignore — fall through to re-throw
        }
      }
      return Promise.reject(error);
    },
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/unit/erp-health-interceptor.test.ts`
Expected: PASS (all `isCustomerContextUrl` + `evaluateErpResponse` cases).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit src/framework/basic-rest/erp/erp-health-interceptor.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/framework/basic-rest/erp/erp-health-interceptor.ts src/test/unit/erp-health-interceptor.test.ts
git commit -m "feat(erp): add erp-health axios interceptor and evaluator"
```

---

## Task 4: Wire the interceptor into both HTTP clients

**Files:**

- Modify: `src/framework/basic-rest/utils/httpB2B.ts`
- Modify: `src/framework/basic-rest/utils/httpPIM.ts`

- [ ] **Step 1: Wire into `httpB2B.ts`**

In `src/framework/basic-rest/utils/httpB2B.ts`, add the import near the existing auth import:

```typescript
import { addAuthInterceptors } from '@/lib/auth';
import { addErpHealthInterceptor } from '@framework/erp/erp-health-interceptor';
```

Then, right after `addAuthInterceptors(http);`, add:

```typescript
// Add auth interceptors (request header + 401 response handling)
addAuthInterceptors(http);

// Track ERP/B2B profile health (4xx/5xx on customer-context endpoints)
addErpHealthInterceptor(http);
```

- [ ] **Step 2: Wire into `httpPIM.ts`**

In `src/framework/basic-rest/utils/httpPIM.ts`, add the import:

```typescript
import { addAuthInterceptors } from '@/lib/auth';
import { addErpHealthInterceptor } from '@framework/erp/erp-health-interceptor';
```

Then, right after `addAuthInterceptors(http);`, add:

```typescript
// Add auth interceptors (request header + 401 response handling)
addAuthInterceptors(http);

// Track ERP/B2B profile health (4xx/5xx on customer-context endpoints)
addErpHealthInterceptor(http);
```

- [ ] **Step 3: Type-check both files**

Run: `npx tsc --noEmit src/framework/basic-rest/utils/httpB2B.ts src/framework/basic-rest/utils/httpPIM.ts`
Expected: no errors.

- [ ] **Step 4: Run the full test suite (nothing should regress)**

Run: `pnpm test`
Expected: PASS — existing tests + the new erp-health tests.

- [ ] **Step 5: Commit**

```bash
git add src/framework/basic-rest/utils/httpB2B.ts src/framework/basic-rest/utils/httpPIM.ts
git commit -m "feat(erp): register erp-health interceptor on B2B and PIM http clients"
```

---

## Task 5: i18n keys

**Files:**

- Modify: `src/app/i18n/locales/en/common.json`
- Modify: `src/app/i18n/locales/it/common.json`
- Modify: `src/app/i18n/locales/de/common.json`
- Modify: `src/app/i18n/locales/es/common.json`
- Modify: `src/app/i18n/locales/ar/common.json`
- Modify: `src/app/i18n/locales/he/common.json`
- Modify: `src/app/i18n/locales/zh/common.json`

Each file is a flat JSON object. The last existing key is `"export-price-notice-line-2"`. For each file: add a comma after that line's closing `"`, then append the three keys before the final `}`.

- [ ] **Step 1: `en/common.json`**

```json
  "export-price-notice-line-2": "They may be subject to subsequent changes; please verify their current validity before placing or confirming an order.",
  "error-erp-profile-title": "There's a problem with your account",
  "error-erp-profile-body": "We couldn't load your prices or cart. There may be an issue with your account profile — please contact {{tenant}} for assistance.",
  "error-erp-profile-contact-cta": "Contact {{tenant}}"
}
```

- [ ] **Step 2: `it/common.json`**

```json
  "export-price-notice-line-2": "...existing value, keep it, add a trailing comma...",
  "error-erp-profile-title": "Si è verificato un problema con il tuo account",
  "error-erp-profile-body": "Non è stato possibile caricare i prezzi o il carrello. Potrebbe esserci un problema con il profilo del tuo account: contatta {{tenant}} per assistenza.",
  "error-erp-profile-contact-cta": "Contatta {{tenant}}"
}
```

- [ ] **Step 3: `de/common.json`**

```json
  "export-price-notice-line-2": "...existing value, keep it, add a trailing comma...",
  "error-erp-profile-title": "Es gibt ein Problem mit Ihrem Konto",
  "error-erp-profile-body": "Ihre Preise oder Ihr Warenkorb konnten nicht geladen werden. Möglicherweise liegt ein Problem mit Ihrem Kontoprofil vor – bitte wenden Sie sich an {{tenant}}.",
  "error-erp-profile-contact-cta": "{{tenant}} kontaktieren"
}
```

- [ ] **Step 4: `es/common.json`**

```json
  "export-price-notice-line-2": "...existing value, keep it, add a trailing comma...",
  "error-erp-profile-title": "Hay un problema con tu cuenta",
  "error-erp-profile-body": "No se pudieron cargar tus precios ni tu carrito. Puede haber un problema con el perfil de tu cuenta: ponte en contacto con {{tenant}} para obtener ayuda.",
  "error-erp-profile-contact-cta": "Contactar con {{tenant}}"
}
```

- [ ] **Step 5: `ar/common.json`**

```json
  "export-price-notice-line-2": "...existing value, keep it, add a trailing comma...",
  "error-erp-profile-title": "هناك مشكلة في حسابك",
  "error-erp-profile-body": "تعذّر تحميل الأسعار أو سلة التسوق. قد تكون هناك مشكلة في ملف حسابك — يُرجى التواصل مع {{tenant}} للحصول على المساعدة.",
  "error-erp-profile-contact-cta": "التواصل مع {{tenant}}"
}
```

- [ ] **Step 6: `he/common.json`**

```json
  "export-price-notice-line-2": "...existing value, keep it, add a trailing comma...",
  "error-erp-profile-title": "יש בעיה בחשבון שלך",
  "error-erp-profile-body": "לא הצלחנו לטעון את המחירים או העגלה שלך. ייתכן שיש בעיה בפרופיל החשבון שלך — אנא צרו קשר עם {{tenant}} לקבלת עזרה.",
  "error-erp-profile-contact-cta": "צרו קשר עם {{tenant}}"
}
```

- [ ] **Step 7: `zh/common.json`**

```json
  "export-price-notice-line-2": "...existing value, keep it, add a trailing comma...",
  "error-erp-profile-title": "您的账户出现问题",
  "error-erp-profile-body": "无法加载您的价格或购物车。您的账户资料可能存在问题，请联系 {{tenant}} 获取帮助。",
  "error-erp-profile-contact-cta": "联系 {{tenant}}"
}
```

- [ ] **Step 8: Validate JSON**

Run: `node -e "['en','it','de','es','ar','he','zh'].forEach(l => { JSON.parse(require('fs').readFileSync('src/app/i18n/locales/'+l+'/common.json','utf8')); console.log(l,'ok'); })"`
Expected: prints `en ok` … `zh ok` with no parse error.

- [ ] **Step 9: Commit**

```bash
git add src/app/i18n/locales/*/common.json
git commit -m "feat(i18n): add erp-profile-error banner strings"
```

---

## Task 6: `<ErpHealthBanner>` component

**Files:**

- Create: `src/components/common/erp-health-banner.tsx`
- Test: `src/test/components/erp-health-banner.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/test/components/erp-health-banner.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { reportErpFailure, reportErpSuccess } from '@framework/erp/erp-health';

// i18n: return key with naive {{tenant}} interpolation
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'tenant' in opts ? `${key}:${opts.tenant}` : key,
    i18n: { resolvedLanguage: 'en' },
  }),
}));

// tenant context
let tenantValue: any = { tenant: { name: 'Acme Supplies' }, isMultiTenant: true };
vi.mock('@contexts/tenant.context', () => ({
  useTenantOptional: () => tenantValue,
}));

import { ErpHealthBanner } from '@components/common/erp-health-banner';

describe('ErpHealthBanner', () => {
  beforeEach(() => {
    reportErpSuccess(); // healthy
    tenantValue = { tenant: { name: 'Acme Supplies' }, isMultiTenant: true };
  });

  it('renders nothing when healthy', () => {
    const { container } = render(<ErpHealthBanner lang="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title and body with tenant name when unhealthy', () => {
    reportErpFailure();
    render(<ErpHealthBanner lang="en" />);
    expect(screen.getByText('error-erp-profile-title')).toBeInTheDocument();
    expect(screen.getByText('error-erp-profile-body:Acme Supplies')).toBeInTheDocument();
  });

  it('renders a mailto link when supportContact is an email', () => {
    tenantValue = {
      tenant: { name: 'Acme Supplies', supportContact: 'help@acme.test' },
      isMultiTenant: true,
    };
    reportErpFailure();
    render(<ErpHealthBanner lang="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'mailto:help@acme.test');
  });

  it('renders a tel link when supportContact is a phone number', () => {
    tenantValue = {
      tenant: { name: 'Acme Supplies', supportContact: '+39 02 1234567' },
      isMultiTenant: true,
    };
    reportErpFailure();
    render(<ErpHealthBanner lang="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'tel:+390212 34567'.replace(/\s/g, '')); // tel: with spaces stripped
  });

  it('renders no link when supportContact is absent', () => {
    reportErpFailure();
    render(<ErpHealthBanner lang="en" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
```

> Note: the `tel:` expectation simply strips whitespace from `+39 02 1234567` → `tel:+390212 34567` is wrong-looking on purpose because `.replace(/\s/g,'')` is applied to the whole string; the component must produce `tel:+390212 34567`? No — the component strips spaces, giving `tel:+39021234567`. Use `expect(link).toHaveAttribute('href', 'tel:+39021234567');` instead. (Replace that assertion line accordingly when writing the test.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/components/erp-health-banner.test.tsx`
Expected: FAIL — cannot resolve `@components/common/erp-health-banner`.

- [ ] **Step 3: Write the component**

Create `src/components/common/erp-health-banner.tsx`:

```tsx
'use client';

import React from 'react';
import { useTranslation } from 'src/app/i18n/client';
import { useTenantOptional } from '@contexts/tenant.context';
import { useErpHealth } from '@framework/erp/erp-health';

interface ErpHealthBannerProps {
  lang: string;
}

type ContactLink = { href: string; label: string } | null;

function buildContactLink(
  contact: string | undefined,
  label: string,
): ContactLink {
  if (!contact) return null;
  const value = contact.trim();
  if (!value) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { href: `mailto:${value}`, label };
  }
  if (/^\+?[\d\s().-]{6,}$/.test(value)) {
    return { href: `tel:${value.replace(/\s/g, '')}`, label };
  }
  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return { href, label };
}

export function ErpHealthBanner({ lang }: ErpHealthBannerProps) {
  const { unhealthy } = useErpHealth();
  const { t } = useTranslation(lang, 'common');
  const tenantCtx = useTenantOptional();

  if (!unhealthy) return null;

  const tenantName = tenantCtx?.tenant?.name?.trim() || t('breadcrumb-home');
  const supportContact = tenantCtx?.tenant?.supportContact;
  const contactLink = buildContactLink(
    supportContact,
    t('error-erp-profile-contact-cta', { tenant: tenantName }),
  );

  return (
    <div
      role="alert"
      className="w-full bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-3 text-sm flex items-start gap-3"
    >
      <svg
        className="w-5 h-5 flex-shrink-0 mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <div className="min-w-0">
        <p className="font-semibold">{t('error-erp-profile-title')}</p>
        <p>{t('error-erp-profile-body', { tenant: tenantName })}</p>
        {contactLink && (
          <p className="mt-1">
            <a className="font-medium underline" href={contactLink.href}>
              {contactLink.label}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

export default ErpHealthBanner;
```

- [ ] **Step 4: Fix the `tel:` assertion in the test**

In `src/test/components/erp-health-banner.test.tsx`, replace the `tel` assertion line with:

```typescript
expect(link).toHaveAttribute('href', 'tel:+39021234567');
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/test/components/erp-health-banner.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit src/components/common/erp-health-banner.tsx`
Expected: no errors. (If the alias `src/app/i18n/client` doesn't resolve under `tsc` standalone, ignore — it resolves in the Next.js build and in Vitest; the existing `auth-guard.tsx` imports it the same way.)

- [ ] **Step 7: Commit**

```bash
git add src/components/common/erp-health-banner.tsx src/test/components/erp-health-banner.test.tsx
git commit -m "feat(ui): add ErpHealthBanner component"
```

---

## Task 7: Mount the banner in the layout

**Files:**

- Modify: `src/app/[lang]/layout.tsx`

- [ ] **Step 1: Import the banner**

In `src/app/[lang]/layout.tsx`, add near the other component imports (e.g. after the `EliaDrawer` import):

```typescript
import { EliaDrawer } from '@components/elia/elia-drawer';
import { ErpHealthBanner } from '@components/common/erp-health-banner';
```

- [ ] **Step 2: Render it above `{children}`**

Find the JSX block:

```tsx
<ManagedUIContext>
  {children}
  <ManagedModal lang={lang} />
  <ManagedDrawer lang={lang} />
  {/* <EliaDrawer /> */}
  <ToasterProvider />
</ManagedUIContext>
```

Change it to:

```tsx
<ManagedUIContext>
  <ErpHealthBanner lang={lang} />
  {children}
  <ManagedModal lang={lang} />
  <ManagedDrawer lang={lang} />
  {/* <EliaDrawer /> */}
  <ToasterProvider />
</ManagedUIContext>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit src/app/[lang]/layout.tsx`
Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Run: `pnpm dev`, then in the browser log in as a B2B user whose ERP profile is broken (or whose backend returns `500` for `/erp/get_multiple_prices` / `400` for `/api/b2b/cart/active`).
Expected:

- The amber banner appears at the top with the title, body (with the tenant name), and the contact link if `supportContact` is configured.
- Browsing other pages keeps the banner visible (no dismiss button).
- When the backend recovers, the banner disappears after the next successful prices/cart call.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS (all suites, including the 3 new ones).

- [ ] **Step 6: Format**

Run: `pnpm format`

- [ ] **Step 7: Commit**

```bash
git add src/app/[lang]/layout.tsx
git commit -m "feat(ui): mount ErpHealthBanner in the app layout"
```

---

## Self-Review notes

- **Spec coverage:** store → Task 2; interceptor + evaluator → Task 3; wiring both http clients → Task 4; banner UI (non-dismissible, tenant name, optional `mailto:`/`tel:` link) → Task 6; mount above both themes → Task 7; optional `supportContact` config → Task 1; i18n in all 7 locales → Task 5. Tests for store/interceptor/banner included in Tasks 2/3/6.
- **Naming consistency:** `reportErpFailure` / `reportErpSuccess` / `getErpHealthSnapshot` / `subscribeErpHealth` / `useErpHealth` used identically across Tasks 2, 3, 6. `evaluateErpResponse` / `isCustomerContextUrl` / `addErpHealthInterceptor` used identically across Tasks 3, 4. `ErpHealthBanner` (named + default export) used identically across Tasks 6, 7.
- **`tel:` test wart:** Step 1 of Task 6 deliberately flags the bad-looking assertion; Step 4 corrects it to `tel:+39021234567` before the test is run. Don't skip Step 4.
- **i18n placeholders:** the `it/de/es/ar/he/zh` blocks show `"...existing value, keep it, add a trailing comma..."` for the `export-price-notice-line-2` line only — that line already exists in each file; just append a comma to it and add the three new keys after it. The three new key values are fully specified for every locale.
