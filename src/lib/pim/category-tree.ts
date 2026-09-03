/**
 * Is the PIM categories tree worth linking to?
 *
 * The catalogue index (`/{lang}/{categoryRoot}`) is built from the PIM
 * *categories* tree, which is a different source from the header/mobile menu.
 * Tenants that keep their groups in an ERP facet rather than a PIM tree publish
 * a single placeholder category — bellieforti's is literally `{category_id:
 * "0", name: "Prodotti"}` — so the index renders "1 GRUPPI" with one entry that
 * leads to an empty page. The drawer link and the sitemap both use this to skip
 * the index for those tenants.
 *
 * `product_count` is 0 on every tenant sampled in production (the counter is
 * not maintained), so it can only ever *add* confidence, never withdraw it. The
 * discriminating signals are the shape of the tree and the ERP `external_code`
 * that wires a flat category to its products.
 *
 * Deliberately structural: the same predicate has to accept the raw
 * `PimCategoryNode` roots the sitemap reads and the `MenuTreeNode`s the client
 * renders, and reach the same verdict on both.
 */
export interface BrowsableCategoryNode {
  children?: readonly BrowsableCategoryNode[] | null;
  /** ERP group code — what maps a childless category to its products. */
  external_code?: string | null;
  product_count?: number | null;
}

/** A single category is a destination when it leads somewhere. */
function leadsSomewhere(node: BrowsableCategoryNode): boolean {
  return (
    (node.children?.length ?? 0) > 0 ||
    Boolean(node.external_code) ||
    (node.product_count ?? 0) > 0
  );
}

export function hasBrowsableCategoryTree(
  nodes: readonly BrowsableCategoryNode[] | null | undefined,
): boolean {
  if (!nodes?.length) return false;
  // More than one entry is already a choice worth showing, whatever the tenant
  // populates on each node. A lone entry has to earn its index page.
  return nodes.length > 1 || nodes.some(leadsSomewhere);
}
