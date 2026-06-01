export interface ProfileRecordsResult {
  available: boolean;
  items: any[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export interface ProfileRecordResult {
  available: boolean;
  item: any | null;
}

/** GET /api/profile/<model> with the given query params (undefined dropped). */
export async function fetchProfileRecords(
  model: string,
  params: Record<string, string | number | undefined>,
): Promise<ProfileRecordsResult> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const res = await fetch(`/api/profile/${model}?${qs.toString()}`);
  if (!res.ok) {
    // 4xx/5xx → treat as "no data" for display (route already logged details).
    return { available: false, items: [] };
  }
  return (await res.json()) as ProfileRecordsResult;
}

/** GET /api/profile/<model>/<id>. */
export async function fetchProfileRecord(
  model: string,
  id: string,
): Promise<ProfileRecordResult> {
  const res = await fetch(`/api/profile/${model}/${encodeURIComponent(id)}`);
  if (!res.ok) return { available: false, item: null };
  return (await res.json()) as ProfileRecordResult;
}
