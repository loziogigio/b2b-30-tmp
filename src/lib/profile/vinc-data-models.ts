import { buildTenantApiHeaders } from '@/lib/tenant/api-headers';
import type { CsCreds } from '@/lib/profile/cs-creds';

/** Models the browser is allowed to request through the profile BFF route. */
export const PROFILE_MODELS = [
  'historical_order',
  'credit_exposure',
  'invoice',
  'delivery_note',
  'payment_schedule',
] as const;

export type ProfileModel = (typeof PROFILE_MODELS)[number];

export function isProfileModel(value: string): value is ProfileModel {
  return (PROFILE_MODELS as readonly string[]).includes(value);
}

/** Top-level data.* date field each model filters & sorts on. */
export const PROFILE_MODEL_DATE_FIELD: Record<ProfileModel, string> = {
  historical_order: 'document_date',
  delivery_note: 'data',
  invoice: 'data',
  credit_exposure: 'snapshot_date',
  payment_schedule: 'data_scadenza',
};

export interface ProfileQuery {
  relation_id: string; // the customer scope (= ERP customer_code)
  status?: string;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
  document_number?: string;
  page?: number; // 1-indexed
  limit?: number; // default 50
  sort?: string; // default -data.document_date
}

/**
 * Translate a ProfileQuery to the VINC data-models query string. Only
 * top-level `data.*` bracket filters are supported by the API; nested paths and
 * `external_ref` are intentionally never emitted (external_ref bypasses tenant
 * scoping). Pure — no network.
 */
export function buildRecordsQuery(
  p: ProfileQuery,
  dateField = 'document_date',
): URLSearchParams {
  const q = new URLSearchParams();
  q.set('relation_id', p.relation_id);
  q.set('limit', String(p.limit ?? 50));
  if (p.page != null) q.set('page', String(p.page));
  q.set('sort', p.sort ?? `-data.${dateField}`);
  if (p.status) q.set('filter[status]', p.status);
  if (p.date_from) q.set(`filter[${dateField}][gte]`, p.date_from);
  if (p.date_to) q.set(`filter[${dateField}][lte]`, p.date_to);
  if (p.document_number) q.set('filter[document_number]', p.document_number);
  return q;
}

function authHeaders(creds: CsCreds, token: string): HeadersInit {
  if (!token || !creds.csBaseUrl || !creds.apiKeyId || !creds.apiSecret) {
    throw new Error('Profile authentication required');
  }
  return buildTenantApiHeaders(creds, {
    authorization: `Bearer ${token}`,
    contentType: false,
  });
}

function modelBase(creds: CsCreds, model: ProfileModel): string {
  return `${creds.csBaseUrl.replace(/\/+$/, '')}/api/b2b/data-models/${model}`;
}

/**
 * Is the data-model available for this tenant? Probes the model/schema endpoint
 * (200 = available). Authorization-dependent responses must never be cached.
 * The generic data-model API remains subject to Suite's storefront boundary;
 * this helper must not fall back to an unmarked service-key request.
 */
export async function probeModelAvailable(
  creds: CsCreds,
  model: ProfileModel,
  token: string,
): Promise<boolean> {
  try {
    const res = await fetch(modelBase(creds, model), {
      headers: authHeaders(creds, token),
      cache: 'no-store',
      redirect: 'manual',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface RecordsPage {
  items: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Fetch a page of records. Throws on non-OK (caller maps to 502). */
export async function fetchModelRecords(
  creds: CsCreds,
  model: ProfileModel,
  query: URLSearchParams,
  token: string,
): Promise<RecordsPage> {
  const res = await fetch(`${modelBase(creds, model)}/records?${query}`, {
    headers: authHeaders(creds, token),
    cache: 'no-store',
    redirect: 'manual',
  });
  if (!res.ok)
    throw new Error(`data-model ${model} records HTTP ${res.status}`);
  const body: any = await res.json();
  return { items: body?.data?.items ?? [], pagination: body?.data?.pagination };
}

/** Fetch one record by VINC `_id`. Returns null on 404. Throws on other non-OK. */
export async function fetchModelRecord(
  creds: CsCreds,
  model: ProfileModel,
  id: string,
  token: string,
): Promise<any | null> {
  const res = await fetch(
    `${modelBase(creds, model)}/records/${encodeURIComponent(id)}`,
    {
      headers: authHeaders(creds, token),
      cache: 'no-store',
      redirect: 'manual',
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`data-model ${model} record HTTP ${res.status}`);
  const body: any = await res.json();
  return body?.data ?? null;
}
