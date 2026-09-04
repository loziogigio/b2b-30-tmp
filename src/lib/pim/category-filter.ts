export type CategoryNode = {
  id: string;
  name?: string;
  level?: number;
  parent_id?: string;
  path?: string[];
};

export type CategoryMap = Record<string, CategoryNode>;

/**
 * Drop selected ancestors and expand the remaining categories to leaf ids.
 * Work is linear in the selected ids plus category-tree size. A global visited
 * set also makes malformed cyclic category data terminate safely.
 */
export function expandCategoryFilterToLeaves(
  ids: string[] | string,
  categoryMap: CategoryMap,
): string[] {
  const list = Array.from(
    new Set((Array.isArray(ids) ? ids : [ids]).map(String)),
  );
  const selected = new Set(list);
  const shadowedAncestors = new Set<string>();

  for (const descendantId of list) {
    for (const ancestor of categoryMap[descendantId]?.path ?? []) {
      const ancestorId = String(ancestor);
      if (ancestorId !== descendantId && selected.has(ancestorId)) {
        shadowedAncestors.add(ancestorId);
      }
    }
  }

  let children: Map<string, CategoryNode[]> | undefined;
  const descendantsFor = (id: string): CategoryNode[] => {
    if (!children) {
      children = new Map<string, CategoryNode[]>();
      for (const node of Object.values(categoryMap)) {
        if (!node?.parent_id) continue;
        const siblings = children.get(node.parent_id) ?? [];
        siblings.push(node);
        children.set(node.parent_id, siblings);
      }
    }
    return children.get(id) ?? [];
  };

  const output = new Set<string>();
  const visited = new Set<string>();
  const stack = list.filter((id) => !shadowedAncestors.has(id)).reverse();

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = categoryMap[id];
    if (!node || node.level === 3) {
      output.add(id);
      continue;
    }
    const descendants = descendantsFor(id);
    if (descendants.length === 0) {
      output.add(id);
      continue;
    }

    for (let index = descendants.length - 1; index >= 0; index -= 1) {
      stack.push(descendants[index].id);
    }
  }

  return Array.from(output);
}
