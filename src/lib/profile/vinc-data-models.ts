/** Models the browser is allowed to request through the profile BFF route. */
export const PROFILE_MODELS = [
  'historical_order',
  'credit_exposure',
  'invoice',
  'delivery_note',
] as const;

export type ProfileModel = (typeof PROFILE_MODELS)[number];

export function isProfileModel(value: string): value is ProfileModel {
  return (PROFILE_MODELS as readonly string[]).includes(value);
}

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
export function buildRecordsQuery(p: ProfileQuery): URLSearchParams {
  const q = new URLSearchParams();
  q.set('relation_id', p.relation_id);
  q.set('limit', String(p.limit ?? 50));
  if (p.page != null) q.set('page', String(p.page));
  q.set('sort', p.sort ?? '-data.document_date');
  if (p.status) q.set('filter[status]', p.status);
  if (p.date_from) q.set('filter[document_date][gte]', p.date_from);
  if (p.date_to) q.set('filter[document_date][lte]', p.date_to);
  if (p.document_number) q.set('filter[document_number]', p.document_number);
  return q;
}
