import type { MenuTreeNode } from '@framework/product/get-pim-menu';

export const ERP_GROUP_PARAM = 'filters-attribute_erp_groups_ss';
export const ERP_GROUP_SEPARATOR = ';';

/** Extract the group code from a menu node's url (e.g. "/search?filters-attribute_erp_groups_ss=10" → "10") */
export function extractGroupCode(node: MenuTreeNode): string | null {
  if (!node.url) return null;
  try {
    const qs = node.url.includes('?') ? node.url.split('?')[1] : '';
    const sp = new URLSearchParams(qs);
    return sp.get(ERP_GROUP_PARAM) || null;
  } catch {
    return null;
  }
}

/** Recursively find a node whose url contains the given group code */
export function findNodeByGroupCode(
  tree: MenuTreeNode[],
  code: string,
): MenuTreeNode | null {
  for (const node of tree) {
    if (extractGroupCode(node) === code) return node;
    if (node.children.length) {
      const found = findNodeByGroupCode(node.children, code);
      if (found) return found;
    }
  }
  return null;
}

/** One node is an ancestor of the other when its path is a prefix of the other's */
function isAncestorOrDescendant(a: MenuTreeNode, b: MenuTreeNode): boolean {
  const [shorter, longer] = a.path.length <= b.path.length ? [a, b] : [b, a];
  return shorter.path.every((seg, i) => longer.path[i] === seg);
}

/**
 * Toggle a group code in the current selection.
 *
 * Products are indexed with their whole erp-group hierarchy in
 * `attribute_erp_groups_ss` and multiple selected codes are OR-ed by the
 * search backend, so selecting a node together with one of its ancestors or
 * descendants is a no-op (the ancestor's result set swallows the child's).
 * Selecting a node therefore REPLACES any selected ancestor/descendant
 * (drill-down/up), while unrelated selections are kept as a multi-select OR.
 */
export function toggleGroupCode(
  tree: MenuTreeNode[],
  current: string[],
  code: string,
): string[] {
  if (current.includes(code)) {
    return current.filter((c) => c !== code);
  }

  const clicked = findNodeByGroupCode(tree, code);
  const isRelated = (other: string): boolean => {
    if (!clicked) return false;
    const node = findNodeByGroupCode(tree, other);
    return node ? isAncestorOrDescendant(node, clicked) : false;
  };

  return [...current.filter((c) => !isRelated(c)), code];
}
