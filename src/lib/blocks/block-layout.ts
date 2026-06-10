/**
 * Page-builder block layout resolution.
 *
 * The vinc-commerce-suite Block Settings dialog stores the "Full Width vs
 * Container" choice on the block itself as `layout: 'full-width' | 'container'`
 * (NOT inside `config`). Older blocks predate that field and instead carried a
 * boolean `config.fullWidth`. Every storefront renderer must resolve the width
 * the same way, so this single helper is the source of truth.
 *
 * Resolution order:
 *   1. `layout: 'full-width'`  → full width (edge-to-edge)
 *   2. `layout: 'container'`   → contained (centered max-width)
 *   3. legacy `config.fullWidth === true` → full width
 *   4. nothing set             → contained (matches prior default)
 */
export interface LayoutAwareBlock {
  layout?: string;
  config?: { fullWidth?: boolean } | null;
}

export function isBlockFullWidth(
  block: LayoutAwareBlock | null | undefined,
): boolean {
  if (block?.layout === 'full-width') return true;
  if (block?.layout === 'container') return false;
  return block?.config?.fullWidth === true;
}
