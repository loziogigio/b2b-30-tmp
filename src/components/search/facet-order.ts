import {
  DEFAULT_FACET_ORDER,
  DEFAULT_HIDDEN_FACETS,
} from '@/framework/basic-rest/utils/filters';
import type { FacetConfig } from '@/lib/home-settings/types';

// A raw facet as produced by the existing filter transform.
export interface RawFacet {
  key: string;
  label: string;
  values?: Array<{ value: unknown }>;
  [k: string]: unknown;
}

/**
 * Order and filter the sidebar facets.
 * - With a non-empty config: use its entry order; drop entries with visible=false
 *   and entries whose field is not present in `raw`.
 * - Without a usable config: use DEFAULT_FACET_ORDER and hide DEFAULT_HIDDEN_FACETS.
 * Unknown keys are skipped, never fatal.
 */
export function orderFacets(
  raw: RawFacet[],
  config?: FacetConfig | null,
): RawFacet[] {
  const byKey = new Map((raw || []).map((f) => [f.key, f]));
  const entries = config?.entries;

  if (entries && entries.length > 0) {
    const result: RawFacet[] = [];
    for (const e of entries) {
      if (!e || e.visible === false) continue;
      const f = byKey.get(e.field);
      if (f) result.push(f);
    }
    return result;
  }

  const hidden = new Set(DEFAULT_HIDDEN_FACETS);
  return DEFAULT_FACET_ORDER.filter((k) => !hidden.has(k))
    .map((k) => byKey.get(k))
    .filter((f): f is RawFacet => Boolean(f));
}

/** The Solr facet field list to request, given an optional config. */
export function facetFieldsToRequest(
  config?: FacetConfig | null,
  fallback: string[] = DEFAULT_FACET_ORDER,
): string[] {
  const entries = config?.entries;
  if (entries && entries.length > 0) {
    return entries.filter((e) => e && e.visible !== false).map((e) => e.field);
  }
  return fallback;
}
