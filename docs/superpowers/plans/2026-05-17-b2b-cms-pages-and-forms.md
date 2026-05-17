# B2B Dynamic CMS Pages & Inline Form Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace vinc-b2b's hardcoded "static" content routes with a single dynamic `[slug]` route that renders pages authored in suite's B2B page builder, and add a `form-contact` block that proxies submissions to suite.

**Architecture:** New server component at `src/app/[lang]/(default)/[slug]/page.tsx` fetches a published `b2bhometemplates` document (one per tenant, keyed by `templateId: "b2b-default-page-{slug}"`), wrapped in `unstable_cache` tagged `page-{tenantId}-{slug}` so suite's existing `invalidateB2BCache(tenantId, ['page:{slug}', 'sitemap'])` (already emitted on publish) flushes it within milliseconds. A new `CmsPageRenderer` dispatches block types to existing block components plus a new `FormBlock` for `form-contact`. The form's client component POSTs to a new `/api/forms/submit` proxy in vinc-b2b that injects API-key headers and forwards to suite's existing `/api/b2b/b2b/public/forms/submit`. Zero changes in vinc-commerce-suite.

**Tech Stack:** Next.js 16 App Router, React Server Components, Mongoose 8 (via `vinc-mongo-db` pooled connection), `unstable_cache` from `next/cache`, `react-hook-form`, vitest + @testing-library/react for tests.

**Reference spec:** `docs/superpowers/specs/2026-05-17-b2b-cms-pages-and-forms-design.md`

---

## File Structure

### New files

| Path                                             | Responsibility                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/db/cms-pages.ts`                        | `loadCmsPage(slug, dbName)` raw fetch + `getCachedCmsPage(slug)` wrapping it in `unstable_cache`.                                |
| `src/app/[lang]/(default)/[slug]/page.tsx`       | Server component. Calls `getCachedCmsPage(slug)`, `notFound()` on miss, exports `generateMetadata`, renders `<CmsPageRenderer>`. |
| `src/components/blocks/CmsPageRenderer.tsx`      | Block dispatcher. Handles every block type suite emits plus the new `form-contact`.                                              |
| `src/components/blocks/FormBlock.tsx`            | Server wrapper around `<FormBlockClient>`.                                                                                       |
| `src/components/blocks/FormBlockClient.tsx`      | Client form, react-hook-form, posts to `/api/forms/submit`.                                                                      |
| `src/app/api/forms/submit/route.ts`              | POST proxy → suite's `/api/b2b/b2b/public/forms/submit`.                                                                         |
| `src/test/unit/cms-pages.test.ts`                | Unit test for `loadCmsPage`.                                                                                                     |
| `src/test/api/forms-submit-route.test.ts`        | Integration test for the proxy.                                                                                                  |
| `src/test/components/form-block-client.test.tsx` | Client form render + submit test.                                                                                                |
| `src/test/components/cms-page-renderer.test.tsx` | Block dispatcher fixtures.                                                                                                       |

### Edited files

| Path                                                            | Change                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/components/blocks/BlockRenderer.tsx`                       | Add `form-contact` case → `<FormBlock>`.                                     |
| `src/components/blocks/HomeBlockRenderer.tsx`                   | Same.                                                                        |
| `src/components/themes/default/home/default-block-renderer.tsx` | Same.                                                                        |
| `src/components/themes/time/home/time-block-renderer.tsx`       | Same.                                                                        |
| `.env.example`                                                  | Add `VINC_SUITE_API_BASE`, `VINC_SUITE_API_KEY_ID`, `VINC_SUITE_API_SECRET`. |
| `.env.deploy.multi`                                             | Same three vars (with comment).                                              |

### Deleted folders

| Path                                   | Reason                      |
| -------------------------------------- | --------------------------- |
| `src/app/[lang]/(default)/contact-us/` | Replaced by `[slug]` route. |
| `src/app/[lang]/(default)/about-us/`   | Same.                       |
| `src/app/[lang]/(default)/faq/`        | Same.                       |
| `src/app/[lang]/(default)/privacy/`    | Same.                       |
| `src/app/[lang]/(default)/terms/`      | Same.                       |
| `src/app/[lang]/(default)/elia/`       | Same.                       |

### NOT created (already exists)

| Path                                  | Why we don't create                                                                                                                                                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mongoose model for `b2bhometemplates` | `src/lib/db/models/home-template.ts` (`HomeTemplateDocument`, `HomeTemplateSchema`, `getHomeTemplateModel`) + `getHomeTemplateModelForDb(dbName)` in `src/lib/db/model-registry.ts` already exist and are bound to the right collection. |
| Tag name `page`                       | Already in `CACHE_TAG_NAMES` in `src/lib/cache/tags.ts:11-21`.                                                                                                                                                                           |
| Redis invalidation subscriber         | Already wired in `src/lib/cache/revalidation-subscriber.ts` + `src/instrumentation.ts`.                                                                                                                                                  |

---

## Conventions reused

- **DB access:** `await connectToDatabase()` (from `src/lib/db/connection.ts`) — already resolves tenant from hostname in multi-tenant mode, env in single-tenant. Returns a Mongoose `Connection`. Use `connection.name` to get the tenant DB name, then `getHomeTemplateModelForDb(connection.name)` for the model.
- **Cache tags:** `cacheTag('page', tenantId, slug)` from `src/lib/cache/tags.ts`. Tenant id via `currentTenantId()`.
- **`unstable_cache`:** see `src/lib/pim/server-fetch.ts` for an existing example using `revalidate: 300` as fallback TTL.
- **Block dispatcher pattern:** see `src/components/blocks/BlockRenderer.tsx` for the "if blockType === X return <Comp/>" pattern, dev-only unknown-block warning.
- **Forms:** `react-hook-form` with `<Input>`/`<TextArea>`/`<Button>` from `@components/ui/*` — pattern in `src/components/common/form/contact-form.tsx`.
- **Test layout:** vitest, files in `src/test/{unit,api,components}/`. Setup in `src/test/setup.ts`. Run a single file with `pnpm test src/test/unit/cms-pages.test.ts`.

---

### Task 1: CMS pages helper with cache

**Files:**

- Create: `src/lib/db/cms-pages.ts`
- Test: `src/test/unit/cms-pages.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/unit/cms-pages.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const findOneMock = vi.fn();
const getModelMock = vi.fn(async () => ({
  findOne: (...args: any[]) => ({ lean: () => findOneMock(...args) }),
}));
const connectMock = vi.fn(async () => ({ name: 'vinc-test-tenant' }));

vi.mock('@/lib/db/connection', () => ({
  connectToDatabase: () => connectMock(),
  getHomeTemplateModelForDb: (db: string) => getModelMock(db),
}));

import { loadCmsPage } from '@/lib/db/cms-pages';

describe('loadCmsPage', () => {
  beforeEach(() => {
    findOneMock.mockReset();
    getModelMock.mockClear();
    connectMock.mockClear();
  });

  it('returns null when no published doc matches', async () => {
    findOneMock.mockResolvedValueOnce(null);
    const out = await loadCmsPage('missing');
    expect(out).toBeNull();
    expect(getModelMock).toHaveBeenCalledWith('vinc-test-tenant');
  });

  it('returns the document on hit', async () => {
    const doc = {
      templateId: 'b2b-default-page-faq',
      status: 'published',
      blocks: [{ id: 'b1', type: 'content-custom-html', config: {} }],
      seo: { title: 'FAQ' },
      version: 1,
    };
    findOneMock.mockResolvedValueOnce(doc);
    const out = await loadCmsPage('faq');
    expect(out).toEqual(doc);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/cms-pages.test.ts`
Expected: FAIL with "Cannot find module '@/lib/db/cms-pages'".

- [ ] **Step 3: Implement the helper**

Create `src/lib/db/cms-pages.ts`:

```typescript
import { unstable_cache } from 'next/cache';
import {
  connectToDatabase,
  getHomeTemplateModelForDb,
} from '@/lib/db/connection';
import { cacheTag, currentTenantId } from '@/lib/cache/tags';
import type { HomeTemplateDocument } from '@/lib/db/models/home-template';

const PORTAL_SLUG = 'default';

const buildTemplateId = (slug: string) => `b2b-${PORTAL_SLUG}-page-${slug}`;

export type CmsPageDocument = Pick<
  HomeTemplateDocument,
  | 'templateId'
  | 'name'
  | 'version'
  | 'status'
  | 'blocks'
  | 'seo'
  | 'publishedAt'
>;

/**
 * Raw, uncached read of a published CMS page by slug.
 * Returns null when the page is missing or only has a draft version.
 */
export async function loadCmsPage(
  slug: string,
): Promise<CmsPageDocument | null> {
  const connection = await connectToDatabase();
  const Model = await getHomeTemplateModelForDb(connection.name);
  const doc = await Model.findOne({
    templateId: buildTemplateId(slug),
    status: 'published',
  }).lean<CmsPageDocument | null>();
  return doc ?? null;
}

/**
 * Cached read of a published CMS page. Tagged with `page-{tenantId}-{slug}`
 * so suite's `invalidateB2BCache(tenantId, ['page:{slug}'])` flushes it on
 * publish. 5-minute TTL safety net when REDIS_HOST is unset.
 */
export async function getCachedCmsPage(
  slug: string,
): Promise<CmsPageDocument | null> {
  const tenantId = await currentTenantId();
  const tag = cacheTag('page', tenantId, slug);
  const fn = unstable_cache(() => loadCmsPage(slug), [tag], {
    tags: [tag],
    revalidate: 300,
  });
  return fn();
}
```

- [ ] **Step 4: Add a third test that asserts the query shape, then re-run**

Append to `describe('loadCmsPage', ...)` in `src/test/unit/cms-pages.test.ts`:

```typescript
it('queries by templateId b2b-default-page-{slug} and published status', async () => {
  let captured: any;
  getModelMock.mockResolvedValueOnce({
    findOne: (q: any) => {
      captured = q;
      return { lean: () => Promise.resolve(null) };
    },
  } as any);
  await loadCmsPage('faq');
  expect(captured).toEqual({
    templateId: 'b2b-default-page-faq',
    status: 'published',
  });
});
```

Run: `pnpm test src/test/unit/cms-pages.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/cms-pages.ts src/test/unit/cms-pages.test.ts
git commit -m "feat(cms): add cached CMS page loader bound to b2bhometemplates"
```

---

### Task 2: Form submit proxy route

**Files:**

- Create: `src/app/api/forms/submit/route.ts`
- Test: `src/test/api/forms-submit-route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/api/forms-submit-route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  process.env.VINC_SUITE_API_BASE = 'https://suite.example.com';
  process.env.VINC_SUITE_API_KEY_ID = 'kid-123';
  process.env.VINC_SUITE_API_SECRET = 'sec-abc';
});

afterEach(() => {
  delete process.env.VINC_SUITE_API_BASE;
  delete process.env.VINC_SUITE_API_KEY_ID;
  delete process.env.VINC_SUITE_API_SECRET;
});

import { POST } from '@/app/api/forms/submit/route';

const makeReq = (body: any, headers: Record<string, string> = {}): Request =>
  new Request('https://b2b.example.com/api/forms/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

describe('POST /api/forms/submit', () => {
  it('forwards headers and translates body to snake_case', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, message: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const req = makeReq(
      { pageSlug: 'faq', formBlockId: 'b1', data: { name: 'X' } },
      { origin: 'https://b2b.example.com' },
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://suite.example.com/api/b2b/b2b/public/forms/submit',
    );
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key-id']).toBe('kid-123');
    expect(init.headers['x-api-secret']).toBe('sec-abc');
    expect(init.headers['origin']).toBe('https://b2b.example.com');
    expect(JSON.parse(init.body)).toEqual({
      page_slug: 'faq',
      form_block_id: 'b1',
      data: { name: 'X' },
    });
  });

  it('returns 503 when API key env vars are missing', async () => {
    delete process.env.VINC_SUITE_API_KEY_ID;
    const req = makeReq({ pageSlug: 'faq', formBlockId: 'b1', data: {} });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/credentials not configured/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 400 when required fields missing from body', async () => {
    const req = makeReq({ pageSlug: 'faq' }); // no formBlockId / data
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns suite error verbatim on suite 4xx', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Field "Email" is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const req = makeReq(
      { pageSlug: 'faq', formBlockId: 'b1', data: {} },
      { origin: 'https://b2b.example.com' },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Field "Email" is required');
  });

  it('returns 502 on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const req = makeReq(
      { pageSlug: 'faq', formBlockId: 'b1', data: {} },
      { origin: 'https://b2b.example.com' },
    );
    const res = await POST(req);
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/api/forms-submit-route.test.ts`
Expected: FAIL with "Cannot find module '@/app/api/forms/submit/route'".

- [ ] **Step 3: Implement the route**

Create `src/app/api/forms/submit/route.ts`:

```typescript
import { NextResponse } from 'next/server';

type SubmitBody = {
  pageSlug?: string;
  formBlockId?: string;
  data?: Record<string, unknown>;
};

export async function POST(req: Request): Promise<Response> {
  const base = process.env.VINC_SUITE_API_BASE;
  const keyId = process.env.VINC_SUITE_API_KEY_ID;
  const secret = process.env.VINC_SUITE_API_SECRET;

  if (!base || !keyId || !secret) {
    return NextResponse.json(
      { error: 'Submit credentials not configured' },
      { status: 503 },
    );
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { pageSlug, formBlockId, data } = body;
  if (!pageSlug || !formBlockId || !data || typeof data !== 'object') {
    return NextResponse.json(
      { error: 'pageSlug, formBlockId, and data are required' },
      { status: 400 },
    );
  }

  const origin =
    req.headers.get('origin') ||
    req.headers.get('referer') ||
    `https://${req.headers.get('host') ?? 'localhost'}`;

  let suiteRes: Response;
  try {
    suiteRes = await fetch(`${base}/api/b2b/b2b/public/forms/submit`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key-id': keyId,
        'x-api-secret': secret,
        origin,
      },
      body: JSON.stringify({
        page_slug: pageSlug,
        form_block_id: formBlockId,
        data,
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Submit upstream unreachable: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const text = await suiteRes.text();
  return new Response(text, {
    status: suiteRes.status,
    headers: { 'content-type': 'application/json' },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/api/forms-submit-route.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/forms/submit/route.ts src/test/api/forms-submit-route.test.ts
git commit -m "feat(forms): add /api/forms/submit proxy to suite"
```

---

### Task 3: FormBlockClient — client-side form renderer

**Files:**

- Create: `src/components/blocks/FormBlockClient.tsx`
- Test: `src/test/components/form-block-client.test.tsx`

This task ONLY builds the client component. Server wrapper + integration into the dispatcher come in Task 4 and Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/test/components/form-block-client.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import FormBlockClient from '@/components/blocks/FormBlockClient';

const baseConfig = {
  variant: 'form' as const,
  title: 'Contact',
  submit_button_text: 'Send',
  success_message: 'Thanks!',
  fields: [
    { id: 'name', type: 'text' as const, label: 'Name', required: true },
    { id: 'email', type: 'email' as const, label: 'Email', required: true },
    { id: 'msg', type: 'textarea' as const, label: 'Message' },
  ],
};

beforeEach(() => fetchMock.mockReset());

describe('FormBlockClient', () => {
  it('renders title and one input per field', () => {
    render(
      <FormBlockClient config={baseConfig} blockId="b1" pageSlug="faq" />,
    );
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  it('blocks submit when required field empty', async () => {
    const user = userEvent.setup();
    render(
      <FormBlockClient config={baseConfig} blockId="b1" pageSlug="faq" />,
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to /api/forms/submit on valid submit and shows success_message', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, message: 'Thanks!' }), {
        status: 200,
      }),
    );
    const user = userEvent.setup();
    render(
      <FormBlockClient config={baseConfig} blockId="b1" pageSlug="faq" />,
    );
    await user.type(screen.getByLabelText('Name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/forms/submit');
    expect(JSON.parse(init.body)).toEqual({
      pageSlug: 'faq',
      formBlockId: 'b1',
      data: { name: 'Alice', email: 'a@b.com', msg: '' },
    });
    expect(await screen.findByText('Thanks!')).toBeInTheDocument();
  });

  it('shows inline error from suite response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Field "Email" is required' }), {
        status: 400,
      }),
    );
    const user = userEvent.setup();
    render(
      <FormBlockClient config={baseConfig} blockId="b1" pageSlug="faq" />,
    );
    await user.type(screen.getByLabelText('Name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(
      await screen.findByText(/Field "Email" is required/),
    ).toBeInTheDocument();
  });

  it('renders select with options', () => {
    const cfg = {
      ...baseConfig,
      fields: [
        {
          id: 'topic',
          type: 'select' as const,
          label: 'Topic',
          required: true,
          options: [
            { label: 'Sales', value: 'sales' },
            { label: 'Support', value: 'support' },
          ],
        },
      ],
    };
    render(<FormBlockClient config={cfg} blockId="b2" pageSlug="faq" />);
    expect(screen.getByLabelText('Topic')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sales' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Support' }),
    ).toBeInTheDocument();
  });

  it('renders checkbox', () => {
    const cfg = {
      ...baseConfig,
      fields: [
        {
          id: 'agree',
          type: 'checkbox' as const,
          label: 'I agree',
        },
      ],
    };
    render(<FormBlockClient config={cfg} blockId="b3" pageSlug="faq" />);
    const checkbox = screen.getByLabelText('I agree');
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });
});
```

- [ ] **Step 2: Verify @testing-library/user-event is installed**

Run: `pnpm list @testing-library/user-event 2>/dev/null | grep user-event`
If empty, install: `pnpm add -D @testing-library/user-event`

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/test/components/form-block-client.test.tsx`
Expected: FAIL with "Cannot find module '@/components/blocks/FormBlockClient'".

- [ ] **Step 4: Implement the client component**

Create `src/components/blocks/FormBlockClient.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useForm, type FieldValues } from 'react-hook-form';

export type FormFieldOption = { label: string; value: string };

export type FormFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'checkbox';

export interface FormFieldConfig {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[];
}

export interface FormBlockConfig {
  variant: 'form';
  title?: string;
  description?: string;
  fields: FormFieldConfig[];
  submit_button_text?: string;
  success_message?: string;
  notification_email?: string;
}

interface Props {
  config: FormBlockConfig;
  blockId: string;
  pageSlug: string;
}

const inputType = (t: FormFieldType): string => {
  if (t === 'textarea' || t === 'select' || t === 'checkbox') return 'text';
  return t;
};

export default function FormBlockClient({ config, blockId, pageSlug }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>();
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'success'; message: string }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  const onSubmit = async (values: FieldValues) => {
    setStatus({ kind: 'idle' });
    try {
      const res = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pageSlug, formBlockId: blockId, data: values }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        setStatus({
          kind: 'error',
          message: body?.error || `Submit failed (${res.status})`,
        });
        return;
      }
      setStatus({
        kind: 'success',
        message:
          body?.message || config.success_message || 'Form submitted',
      });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: `Network error: ${(err as Error).message}`,
      });
    }
  };

  if (status.kind === 'success') {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
        {status.message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {config.title && (
        <h2 className="text-lg font-semibold">{config.title}</h2>
      )}
      {config.description && (
        <p className="text-sm text-gray-600">{config.description}</p>
      )}

      {config.fields.map((field) => {
        const reg = register(field.id, {
          required: field.required ? `${field.label} is required` : false,
        });
        const id = `field-${blockId}-${field.id}`;
        const err = errors[field.id]?.message as string | undefined;
        return (
          <div key={field.id} className="space-y-1">
            <label
              htmlFor={id}
              className="block text-sm font-medium text-gray-700"
            >
              {field.label}
              {field.required && (
                <span className="text-red-500"> *</span>
              )}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                id={id}
                {...reg}
                placeholder={field.placeholder}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                rows={4}
              />
            ) : field.type === 'select' ? (
              <select
                id={id}
                {...reg}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">--</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <input
                id={id}
                type="checkbox"
                {...reg}
                className="h-4 w-4"
              />
            ) : (
              <input
                id={id}
                type={inputType(field.type)}
                {...reg}
                placeholder={field.placeholder}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            )}

            {err && <p className="text-xs text-red-600">{err}</p>}
          </div>
        );
      })}

      {status.kind === 'error' && (
        <p className="text-sm text-red-600">{status.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? '...' : config.submit_button_text ?? 'Submit'}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/test/components/form-block-client.test.tsx`
Expected: 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/blocks/FormBlockClient.tsx src/test/components/form-block-client.test.tsx
git commit -m "feat(forms): FormBlockClient renders react-hook-form from FormBlockConfig"
```

---

### Task 4: FormBlock server wrapper

**Files:**

- Create: `src/components/blocks/FormBlock.tsx`

- [ ] **Step 1: Implement the server wrapper**

Create `src/components/blocks/FormBlock.tsx`:

```typescript
import FormBlockClient, {
  type FormBlockConfig,
} from './FormBlockClient';

interface Props {
  config: FormBlockConfig;
  blockId: string;
  pageSlug: string;
}

export function FormBlock({ config, blockId, pageSlug }: Props) {
  return (
    <FormBlockClient config={config} blockId={blockId} pageSlug={pageSlug} />
  );
}
```

- [ ] **Step 2: Type-check the file**

Run: `npx tsc --noEmit src/components/blocks/FormBlock.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/FormBlock.tsx
git commit -m "feat(forms): add FormBlock server wrapper"
```

---

### Task 5: CmsPageRenderer block dispatcher

**Files:**

- Create: `src/components/blocks/CmsPageRenderer.tsx`
- Test: `src/test/components/cms-page-renderer.test.tsx`

- [ ] **Step 1: Identify the existing block components**

Before writing the renderer, list the components it will delegate to. Run:

```bash
ls src/components/blocks/
```

Expected files to exist already (Task 0 references): `RichTextBlock.tsx`, `CustomHTMLBlock.tsx`, `MediaImageBlock.tsx`, `YouTubeEmbedBlock.tsx`, `SpacerBlock.tsx`, `ProductDataTableBlock.tsx`, `ProductInfoBlock.tsx`, `ProductSuggestionsBlock.tsx`.

If any are missing, stop and report — `CmsPageRenderer` cannot delegate to something that does not exist.

- [ ] **Step 2: Write the failing test**

Create `src/test/components/cms-page-renderer.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/blocks/CustomHTMLBlock', () => ({
  CustomHTMLBlock: ({ config }: any) => (
    <div data-testid="custom-html">{config?.html}</div>
  ),
}));
vi.mock('@/components/blocks/RichTextBlock', () => ({
  RichTextBlock: ({ config }: any) => (
    <div data-testid="rich-text">{config?.html}</div>
  ),
}));
vi.mock('@/components/blocks/MediaImageBlock', () => ({
  MediaImageBlock: ({ config }: any) => (
    <img data-testid="media-image" alt="" src={config?.src} />
  ),
}));
vi.mock('@/components/blocks/YouTubeEmbedBlock', () => ({
  YouTubeEmbedBlock: ({ config }: any) => (
    <div data-testid="yt">{config?.videoId}</div>
  ),
}));
vi.mock('@/components/blocks/SpacerBlock', () => ({
  SpacerBlock: () => <div data-testid="spacer" />,
}));
vi.mock('@/components/blocks/FormBlock', () => ({
  FormBlock: ({ config, blockId, pageSlug }: any) => (
    <div data-testid="form" data-block-id={blockId} data-page={pageSlug}>
      {config?.title}
    </div>
  ),
}));

import { CmsPageRenderer } from '@/components/blocks/CmsPageRenderer';

const block = (over: any) => ({
  id: 'b1',
  order: 0,
  config: {},
  metadata: {},
  ...over,
});

describe('CmsPageRenderer', () => {
  it('renders content-custom-html via CustomHTMLBlock', () => {
    render(
      <CmsPageRenderer
        pageSlug="faq"
        lang="it"
        blocks={[block({ type: 'content-custom-html', config: { html: 'X' } })]}
      />,
    );
    expect(screen.getByTestId('custom-html')).toHaveTextContent('X');
  });

  it('accepts short alias customHTML', () => {
    render(
      <CmsPageRenderer
        pageSlug="faq"
        lang="it"
        blocks={[block({ type: 'customHTML', config: { html: 'Y' } })]}
      />,
    );
    expect(screen.getByTestId('custom-html')).toHaveTextContent('Y');
  });

  it('renders form-contact via FormBlock with blockId + pageSlug', () => {
    render(
      <CmsPageRenderer
        pageSlug="faq"
        lang="it"
        blocks={[
          block({
            id: 'form-1',
            type: 'form-contact',
            config: { variant: 'form', title: 'Hello', fields: [] },
          }),
        ]}
      />,
    );
    const node = screen.getByTestId('form');
    expect(node).toHaveTextContent('Hello');
    expect(node).toHaveAttribute('data-block-id', 'form-1');
    expect(node).toHaveAttribute('data-page', 'faq');
  });

  it('silently skips unknown block in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const { container } = render(
      <CmsPageRenderer
        pageSlug="faq"
        lang="it"
        blocks={[block({ type: 'mystery', config: {} })]}
      />,
    );
    process.env.NODE_ENV = prev;
    expect(container.textContent).toBe('');
  });

  it('renders blocks in array order', () => {
    render(
      <CmsPageRenderer
        pageSlug="faq"
        lang="it"
        blocks={[
          block({ id: 'a', type: 'content-custom-html', config: { html: 'A' } }),
          block({ id: 'b', type: 'content-custom-html', config: { html: 'B' } }),
        ]}
      />,
    );
    const nodes = screen.getAllByTestId('custom-html');
    expect(nodes[0]).toHaveTextContent('A');
    expect(nodes[1]).toHaveTextContent('B');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/test/components/cms-page-renderer.test.tsx`
Expected: FAIL with "Cannot find module '@/components/blocks/CmsPageRenderer'".

- [ ] **Step 4: Implement the dispatcher**

Create `src/components/blocks/CmsPageRenderer.tsx`:

```typescript
import { Fragment } from 'react';
import { RichTextBlock } from './RichTextBlock';
import { CustomHTMLBlock } from './CustomHTMLBlock';
import { MediaImageBlock } from './MediaImageBlock';
import { YouTubeEmbedBlock } from './YouTubeEmbedBlock';
import { SpacerBlock } from './SpacerBlock';
import { ProductDataTableBlock } from './ProductDataTableBlock';
import { FormBlock } from './FormBlock';

interface CmsBlock {
  id: string;
  type: string;
  order?: number;
  config: any;
  metadata?: Record<string, unknown>;
}

interface Props {
  blocks: CmsBlock[];
  pageSlug: string;
  lang: string;
}

function renderOne(block: CmsBlock, pageSlug: string, lang: string) {
  const t = block.type;
  const variant = block.config?.variant;

  if (t === 'content-rich-text' || t === 'richText') {
    return <RichTextBlock config={block.config} />;
  }
  if (t === 'content-custom-html' || t === 'customHTML') {
    return <CustomHTMLBlock config={block.config} />;
  }
  if (t === 'media-image') {
    return <MediaImageBlock config={block.config} />;
  }
  if (t === 'media-youtube' || t === 'youtubeEmbed') {
    return <YouTubeEmbedBlock config={block.config} />;
  }
  if (t === 'spacer') {
    return <SpacerBlock config={block.config} />;
  }
  if (
    t === 'productDetail-dataTable' ||
    t === 'product-data-table' ||
    t === 'productDataTable' ||
    t === 'attribute-table' ||
    variant === 'productDataTable' ||
    variant === 'product-data-table'
  ) {
    return <ProductDataTableBlock config={block.config} lang={lang} />;
  }
  if (t === 'form-contact') {
    return (
      <FormBlock
        config={block.config}
        blockId={block.id}
        pageSlug={pageSlug}
      />
    );
  }

  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
        Unknown CMS block type: {t}
      </div>
    );
  }
  return null;
}

export function CmsPageRenderer({ blocks, pageSlug, lang }: Props) {
  return (
    <>
      {blocks.map((b) => (
        <Fragment key={b.id}>{renderOne(b, pageSlug, lang)}</Fragment>
      ))}
    </>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/test/components/cms-page-renderer.test.tsx`
Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/blocks/CmsPageRenderer.tsx src/test/components/cms-page-renderer.test.tsx
git commit -m "feat(cms): CmsPageRenderer dispatches blocks (incl. form-contact)"
```

---

### Task 6: Dynamic `[slug]` route

**Files:**

- Create: `src/app/[lang]/(default)/[slug]/page.tsx`

No automated test for this file — it is a thin composition of already-tested units. Manual verification follows in Task 9.

- [ ] **Step 1: Implement the route**

Create `src/app/[lang]/(default)/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCachedCmsPage } from '@/lib/db/cms-pages';
import { CmsPageRenderer } from '@/components/blocks/CmsPageRenderer';

interface RouteParams {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCachedCmsPage(slug);
  if (!page) return {};
  const seo = (page.seo ?? {}) as {
    title?: string;
    description?: string;
    og_image?: string;
  };
  return {
    title: seo.title || page.name,
    description: seo.description,
    openGraph: seo.og_image ? { images: [seo.og_image] } : undefined,
  };
}

export default async function CmsPage({ params }: RouteParams) {
  const { lang, slug } = await params;
  const page = await getCachedCmsPage(slug);
  if (!page) notFound();

  return (
    <CmsPageRenderer
      blocks={page.blocks ?? []}
      pageSlug={slug}
      lang={lang}
    />
  );
}
```

- [ ] **Step 2: Type-check the file**

Run: `npx tsc --noEmit src/app/[lang]/\(default\)/[slug]/page.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add 'src/app/[lang]/(default)/[slug]/page.tsx'
git commit -m "feat(cms): add dynamic [slug] route rendering b2bhometemplates"
```

---

### Task 7: Wire `form-contact` into the other block renderers

The new `FormBlock` should also render when admins drop a `form-contact` block on the **home page** or a **product detail** page.

**Files:**

- Modify: `src/components/blocks/BlockRenderer.tsx`
- Modify: `src/components/blocks/HomeBlockRenderer.tsx`
- Modify: `src/components/themes/default/home/default-block-renderer.tsx`
- Modify: `src/components/themes/time/home/time-block-renderer.tsx`

- [ ] **Step 1: Edit `BlockRenderer.tsx`**

Add the import alongside the existing block imports:

```typescript
import { FormBlock } from './FormBlock';
```

Inside the `BlockRenderer` function, before the legacy/unknown block branch (after the existing `product-data-table` block, near line 75 in the current file), add:

```typescript
  if (blockType === 'form-contact') {
    return (
      <FormBlock
        config={block.config as any}
        blockId={block.id}
        pageSlug={(productData?.pageSlug as string) || ''}
      />
    );
  }
```

- [ ] **Step 2: Edit `HomeBlockRenderer.tsx`**

Read the file to find where the block-type switch lives:

```bash
grep -n "block.type\|blockType ==" src/components/blocks/HomeBlockRenderer.tsx | head -10
```

Add the same import + same case (omit `productData?.pageSlug`; use literal `'home'`):

```typescript
import { FormBlock } from './FormBlock';

// inside the dispatcher
if (block.type === 'form-contact') {
  return (
    <FormBlock
      config={block.config as any}
      blockId={block.id}
      pageSlug="home"
    />
  );
}
```

- [ ] **Step 3: Edit the two theme block renderers**

Repeat Step 2's pattern in:

- `src/components/themes/default/home/default-block-renderer.tsx`
- `src/components/themes/time/home/time-block-renderer.tsx`

Use the same `pageSlug="home"` literal.

- [ ] **Step 4: Type-check all four files**

Run:

```bash
npx tsc --noEmit \
  src/components/blocks/BlockRenderer.tsx \
  src/components/blocks/HomeBlockRenderer.tsx \
  src/components/themes/default/home/default-block-renderer.tsx \
  src/components/themes/time/home/time-block-renderer.tsx
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/blocks/BlockRenderer.tsx \
        src/components/blocks/HomeBlockRenderer.tsx \
        src/components/themes/default/home/default-block-renderer.tsx \
        src/components/themes/time/home/time-block-renderer.tsx
git commit -m "feat(blocks): render form-contact in product-detail and home renderers"
```

---

### Task 8: Delete legacy static route folders

**Files (to be deleted):**

- `src/app/[lang]/(default)/contact-us/`
- `src/app/[lang]/(default)/about-us/`
- `src/app/[lang]/(default)/faq/`
- `src/app/[lang]/(default)/privacy/`
- `src/app/[lang]/(default)/terms/`
- `src/app/[lang]/(default)/elia/`

- [ ] **Step 1: Identify any components only used by those routes**

Run:

```bash
grep -rEn "from '@/?components/contact-us|from '@/?components/about-us" src 2>/dev/null
# also any direct import of hardcoded page components
for dir in contact-us about-us faq privacy terms elia; do
  echo "=== $dir uses ==="
  grep -rn "/$dir/" src/app 2>/dev/null
done
```

If any other code imports from inside these folders, stop and flag — those imports break when the folder is deleted.

- [ ] **Step 2: Remove the six folders**

```bash
git rm -r 'src/app/[lang]/(default)/contact-us' \
          'src/app/[lang]/(default)/about-us' \
          'src/app/[lang]/(default)/faq' \
          'src/app/[lang]/(default)/privacy' \
          'src/app/[lang]/(default)/terms' \
          'src/app/[lang]/(default)/elia'
```

- [ ] **Step 3: Verify no broken imports**

Run: `pnpm tsc --noEmit 2>&1 | head -40`
Expected: zero new errors from these deletes (existing pre-existing errors in the project are unrelated).

If there ARE new errors, they come from a component imported only by a deleted page — either delete that orphan component too or restore the route.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(cms): delete legacy static content routes (replaced by [slug])"
```

---

### Task 9: Document required env vars

**Files:**

- Modify: `.env.example` (create if missing)
- Modify: `.env.deploy.multi`

- [ ] **Step 1: Read both files**

```bash
cat .env.example 2>/dev/null
cat .env.deploy.multi
```

- [ ] **Step 2: Append the three vars to `.env.example`**

Add at the bottom:

```dotenv
# vinc-commerce-suite proxy (form submissions, future read-thru endpoints).
# All three are REQUIRED for /api/forms/submit to work; absent → 503.
VINC_SUITE_API_BASE=https://suite.your-domain.com
VINC_SUITE_API_KEY_ID=
VINC_SUITE_API_SECRET=
```

- [ ] **Step 3: Append to `.env.deploy.multi` with the same comment**

Add at the bottom of `.env.deploy.multi`:

```dotenv
# vinc-commerce-suite proxy for form submissions.
# Set VINC_SUITE_API_KEY_ID / VINC_SUITE_API_SECRET at `docker run -e ...` time.
# Without them, /api/forms/submit returns 503.
VINC_SUITE_API_BASE=https://suite.your-domain.com
```

- [ ] **Step 4: Commit**

```bash
git add .env.example .env.deploy.multi
git commit -m "chore(env): document VINC_SUITE_API_* for form submit proxy"
```

---

### Task 10: Manual end-to-end verification on a real tenant

This task is NOT code. It is the gate before declaring the feature done.

- [ ] **Step 1: Pick a tenant DB and confirm a published page exists**

In a tenant DB, confirm there is a `b2bhometemplates` document with `templateId` matching `b2b-default-page-<some-slug>` and `status: 'published'`. Find one with:

```javascript
db.b2bhometemplates.find(
  { templateId: { $regex: '^b2b-default-page-' }, status: 'published' },
  { templateId: 1, status: 1, 'blocks.type': 1 },
);
```

If none exist, author one in suite's B2B page builder UI and publish it.

- [ ] **Step 2: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 3: Visit `https://<portal-domain>/<lang>/<slug>` in a browser**

Verify the page renders the blocks from the published template. Verify any `content-custom-html` block displays its HTML.

- [ ] **Step 4: Add a `form-contact` block in suite and re-publish**

In the suite B2B page builder for the same page, add a Form (Contact) block with two or three required fields. Click Publish.

- [ ] **Step 5: Confirm push invalidation**

Reload the storefront page within 30 seconds. The new form should render — **without** a deploy and **without** waiting for the 5-minute TTL. If it does not appear:

- Check the dev server logs for `[revalidate] flushed tags for tenant ...`
- If absent, confirm `REDIS_HOST` is set in the environment that runs vinc-b2b; otherwise the storefront is on TTL-only fallback and will pick up the change after 5 minutes.

- [ ] **Step 6: Submit the form**

Fill required fields, submit. Verify:

- Success banner shows the configured `success_message`.
- A row appears in `b2bformsubmissions` with `form_type: 'page_form'`, `page_slug` matching the URL slug, and `data` matching the submitted values.
- If `notification_email` is configured on the form block, the notification email arrives.

- [ ] **Step 7: Trigger error paths**

- Submit with a required field empty → inline validation error, no network call.
- Stop the suite service, submit → 502 from `/api/forms/submit`, inline error in the form.
- Unset `VINC_SUITE_API_KEY_ID`, restart dev server, submit → 503, inline error.

- [ ] **Step 8: Write a short verification note in the PR description**

Include the tenant id used (kept out of the spec/plan per repo convention) and a screenshot of the rendered page + a screenshot of the new `b2bformsubmissions` row.

---

## Definition of Done

- All eight implementation tasks committed.
- `pnpm test src/test/unit/cms-pages.test.ts src/test/api/forms-submit-route.test.ts src/test/components/form-block-client.test.tsx src/test/components/cms-page-renderer.test.tsx` → green.
- `npx tsc --noEmit` reports no new errors on the changed files.
- Manual E2E in Task 10 passes for at least one real tenant.
- The six legacy route folders no longer exist.
- `.env.example` and `.env.deploy.multi` reference `VINC_SUITE_API_*`.
