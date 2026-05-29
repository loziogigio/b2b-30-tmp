/**
 * Dynamic category-root routing helpers (spec D2/D3).
 *
 * The canonical category route lives at `/{lang}/categorie/{path}`. A tenant may
 * declare a different, per-locale public root segment (e.g. `prodotti`). The
 * middleware then:
 *   - rewrites  `/{lang}/{root}/{rest}` → `/{lang}/categorie/{rest}`  (transparent)
 *   - redirects `/{lang}/categorie/{rest}` → `/{lang}/{root}/{rest}`  (301, when root != categorie)
 *
 * The map is read from `NEXT_PUBLIC_CATEGORY_ROOT` so the Edge middleware can be
 * pure/sync (no Mongo / suite call). It accepts either a single string applied
 * to every locale, or a JSON object `{ "default": "...", "it": "...", ... }`.
 * SSR pages still read the authoritative config from vcs `seo-config`.
 */

export const DEFAULT_CATEGORY_ROOT = 'categorie';

export type CategoryRootMap = Record<string, string> & { default: string };

/** Parse the `NEXT_PUBLIC_CATEGORY_ROOT` env value into a per-locale map. */
export function parseCategoryRootEnv(raw: string | undefined): CategoryRootMap {
  if (!raw) return { default: DEFAULT_CATEGORY_ROOT };
  const trimmed = raw.trim();
  if (!trimmed) return { default: DEFAULT_CATEGORY_ROOT };
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, string>;
      return { default: DEFAULT_CATEGORY_ROOT, ...obj };
    } catch {
      return { default: DEFAULT_CATEGORY_ROOT };
    }
  }
  // Single string → applies to all locales as the default.
  return { default: trimmed };
}

/** The configured root segment for a locale, defaulting to `categorie`. */
export function categoryRootFor(map: CategoryRootMap, lang: string): string {
  return map[lang] || map.default || DEFAULT_CATEGORY_ROOT;
}

export interface RewriteDecision {
  /** Internal-rewrite the request to this pathname (transparent to the URL bar). */
  rewriteTo?: string;
  /** 301-redirect the browser to this pathname. */
  redirectTo?: string;
}

/**
 * Decide how to route a path given the configured category root.
 *
 * @param pathname e.g. `/it/prodotti/bagno`
 * @param map      per-locale category root map
 *
 * Rules (only when the configured root differs from `categorie`):
 *  - `/{lang}/{root}/{rest}`     → rewrite to `/{lang}/categorie/{rest}`
 *  - `/{lang}/{root}`            → rewrite to `/{lang}/categorie`
 *  - `/{lang}/categorie/{rest}`  → 301 redirect to `/{lang}/{root}/{rest}`
 *  - `/{lang}/categorie`         → 301 redirect to `/{lang}/{root}`
 * When the configured root IS `categorie`, nothing happens (no-op).
 */
export function decideCategoryRouting(
  pathname: string,
  map: CategoryRootMap,
): RewriteDecision {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) return {};

  const [lang, head, ...rest] = segments;
  const root = categoryRootFor(map, lang);

  // No-op when the tenant uses the default root.
  if (root === DEFAULT_CATEGORY_ROOT) return {};

  const tail = rest.length ? `/${rest.join('/')}` : '';

  // Public root → rewrite to the internal `categorie` route.
  if (head === root) {
    return { rewriteTo: `/${lang}/${DEFAULT_CATEGORY_ROOT}${tail}` };
  }

  // Legacy `categorie` → 301 to the configured public root (back-compat).
  if (head === DEFAULT_CATEGORY_ROOT) {
    return { redirectTo: `/${lang}/${root}${tail}` };
  }

  return {};
}
