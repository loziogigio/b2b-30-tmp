// ===============================
// Type Definitions
// ===============================

import { PIM_FACET_FIELDS } from '@framework/utils/filters';

export interface RawFacetEntry {
  value: string;
  count: number;
  label: string;
  key_label: string;
}

export interface RawFacetResult {
  [key: string]: RawFacetEntry[];
}

export interface FilterValue {
  value: string;
  label: string;
  count: number;
}

export interface TransformedFilter {
  key: string;
  label: string;
  values: FilterValue[];
}

// ===============================
// Transformation Logic
// ===============================

export function transformFilters(
  facet_results: RawFacetResult,
): TransformedFilter[] {
  if (!facet_results || typeof facet_results !== 'object') return [];

  const transformed: TransformedFilter[] = [];

  // Step 1: Determine the most specific 'family_levX' (e.g., family_lev3 -> lev2 -> lev1)
  const familyKeys = Object.keys(facet_results).filter((key) =>
    key.startsWith('family_lev'),
  );
  const sortedFamilyKeys = familyKeys.sort((a, b) => {
    const aNum = parseInt(a.replace('family_lev', ''), 10);
    const bNum = parseInt(b.replace('family_lev', ''), 10);
    return bNum - aNum; // Descending: highest first
  });

  const usedKeys = new Set<string>();

  if (sortedFamilyKeys.length > 0) {
    const highestFamilyKey = sortedFamilyKeys[0];
    usedKeys.add(highestFamilyKey);

    const familyData = facet_results[highestFamilyKey];
    if (Array.isArray(familyData)) {
      transformed.push({
        key: 'family',
        label: familyData[0]?.key_label || 'Categoria',
        values: familyData.map((f) => ({
          value: f.value,
          label: f.label,
          count: f.count,
        })),
      });
    }
  }

  // Step 2: Transform all other facets
  for (const key in facet_results) {
    if (usedKeys.has(key)) continue;

    const facetGroup = facet_results[key];
    if (!Array.isArray(facetGroup) || facetGroup.length === 0) continue;

    transformed.push({
      key,
      label: facetGroup[0].key_label || key,
      values: facetGroup.map((f) => ({
        value: f.value,
        label: f.label,
        count: f.count,
      })),
    });
  }

  return transformed;
}

// ===============================
// Payload Transformation
// ===============================

export function transformFilterParamsForApi(
  params: Record<string, any>,
): Record<string, any> {
  const allowedParams = Object.keys(params).reduce(
    (acc, key) => {
      if (
        key.startsWith('filters-') ||
        key === 'address_code' ||
        key === 'customer_code' ||
        key === 'text' ||
        key === 'category'
      ) {
        acc[key] = params[key];
      }
      return acc;
    },
    {} as Record<string, any>,
  );

  // Use centralized facet fields
  allowedParams['facet_fields'] = PIM_FACET_FIELDS;
  allowedParams['filters-include_faceting'] = true;

  return allowedParams;
}
