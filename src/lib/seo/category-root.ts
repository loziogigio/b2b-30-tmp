/**
 * Dynamic category-root routing helpers (spec D2/D3).
 *
 * The canonical category route lives at `/{lang}/categorie/{path}`. A tenant may
 * declare a different, per-locale public root segment (e.g. `prodotti`). The
 * middleware then:
 *   - rewrites  `/{lang}/{root}/{rest}` → `/{lang}/categorie/{rest}`  (transparent)
 *   - redirects `/{lang}/categorie/{rest}` → `/{lang}/{root}/{rest}`  (301, when root != categorie)
 *
 * VCS `seo-config` is the authoritative source. `NEXT_PUBLIC_CATEGORY_ROOT`
 * remains a failure fallback for deployments where VCS cannot be reached. The
 * env value accepts either a single string applied to every locale, or a JSON
 * object `{ "default": "...", "it": "...", ... }`.
 */

export const DEFAULT_CATEGORY_ROOT = 'categorie';

export type CategoryRootMap = Record<string, string> & { default: string };

const CATEGORY_ROOT_SEGMENT = /^[\p{L}\p{N}][\p{L}\p{N}-]*$/u;

/** Category roots are one URL segment, never a path or query fragment. */
export function isCategoryRootSegment(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim() === value &&
    CATEGORY_ROOT_SEGMENT.test(value)
  );
}

/** Sanitize an arbitrary per-locale root map received from VCS or env JSON. */
export function normalizeCategoryRootMap(raw: unknown): CategoryRootMap {
  const result: CategoryRootMap = { default: DEFAULT_CATEGORY_ROOT };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;

  for (const [locale, value] of Object.entries(raw)) {
    if (!/^[a-z0-9_-]+$/i.test(locale)) continue;
    if (typeof value !== 'string') continue;
    const segment = value.trim();
    if (isCategoryRootSegment(segment)) result[locale] = segment;
  }

  return result;
}

/** Parse the `NEXT_PUBLIC_CATEGORY_ROOT` env value into a per-locale map. */
export function parseCategoryRootEnv(raw: string | undefined): CategoryRootMap {
  if (!raw) return { default: DEFAULT_CATEGORY_ROOT };
  const trimmed = raw.trim();
  if (!trimmed) return { default: DEFAULT_CATEGORY_ROOT };
  if (trimmed.startsWith('{')) {
    try {
      return normalizeCategoryRootMap(JSON.parse(trimmed));
    } catch {
      return { default: DEFAULT_CATEGORY_ROOT };
    }
  }
  // Single string → applies to all locales as the default.
  return isCategoryRootSegment(trimmed)
    ? { default: trimmed }
    : { default: DEFAULT_CATEGORY_ROOT };
}

/** The configured root segment for a locale, defaulting to `categorie`. */
export function categoryRootFor(map: CategoryRootMap, lang: string): string {
  const root = map[lang] || map.default;
  return isCategoryRootSegment(root) ? root : DEFAULT_CATEGORY_ROOT;
}

/** Build the public, path-only href for a category root or nested category. */
export function categoryDetailHref(
  lang: string,
  path: readonly string[] = [],
  root: string = DEFAULT_CATEGORY_ROOT,
): string {
  const segments = [lang, root || DEFAULT_CATEGORY_ROOT, ...path]
    .map((segment) => String(segment).trim())
    .filter(Boolean)
    .map(encodeURIComponent);
  return `/${segments.join('/')}`;
}

/**
 * Resolve a PIM-authored category-menu destination against the public root.
 * Legacy `/categorie` destinations are canonicalized while unrelated CMS,
 * search and absolute destinations retain their authored meaning.
 */
export function categoryMenuHref(
  lang: string,
  path: readonly string[],
  root: string = DEFAULT_CATEGORY_ROOT,
  authoredUrl?: string | null,
): string {
  const fallback = categoryDetailHref(lang, path, root);
  const authored = authoredUrl?.trim();
  if (!authored) return fallback;

  // Preserve safe external/contact links, but never turn menu data into an
  // executable javascript:/data: navigation target.
  if (/^(?:javascript|data|vbscript):/i.test(authored)) return fallback;
  if (/^(?:https?:|mailto:|tel:|\/\/)/i.test(authored)) return authored;
  if (/^[a-z][a-z\d+.-]*:/i.test(authored)) return fallback;

  const suffixIndex = authored.search(/[?#]/);
  const rawPath = suffixIndex >= 0 ? authored.slice(0, suffixIndex) : authored;
  const suffix = suffixIndex >= 0 ? authored.slice(suffixIndex) : '';
  const pathname = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const localizedRoot = categoryDetailHref(lang, [], root);
  const encodedLang = encodeURIComponent(lang);
  const encodedRoot = encodeURIComponent(root || DEFAULT_CATEGORY_ROOT);

  const categoryPrefixes = [
    `/${lang}/${DEFAULT_CATEGORY_ROOT}`,
    `/${encodedLang}/${DEFAULT_CATEGORY_ROOT}`,
    `/${lang}/${root}`,
    `/${encodedLang}/${encodedRoot}`,
    `/${DEFAULT_CATEGORY_ROOT}`,
    `/${root}`,
    `/${encodedRoot}`,
  ];

  for (const prefix of new Set(categoryPrefixes)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return `${localizedRoot}${pathname.slice(prefix.length)}${suffix}`;
    }
  }

  // Already localized non-category destinations stay as authored. Other
  // relative destinations keep the header menu's established lang prefix.
  if (pathname === `/${lang}` || pathname.startsWith(`/${lang}/`)) {
    return `${pathname}${suffix}`;
  }
  return `/${encodedLang}${pathname}${suffix}`;
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
  const rawSegments = pathname.split('/').filter(Boolean);
  if (rawSegments.length < 2) return {};

  const decodeSegment = (segment: string) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  };
  const segments = rawSegments.map(decodeSegment);

  const [lang, head] = segments;
  const root = categoryRootFor(map, lang);

  // No-op when the tenant uses the default root.
  if (root === DEFAULT_CATEGORY_ROOT) return {};

  // Keep the original encoding for descendant slugs while comparing the
  // public root in decoded form (configured roots may contain Unicode).
  const rawRest = rawSegments.slice(2);
  const tail = rawRest.length ? `/${rawRest.join('/')}` : '';

  // Public root → rewrite to the internal `categorie` route.
  if (head === root) {
    return { rewriteTo: `/${lang}/${DEFAULT_CATEGORY_ROOT}${tail}` };
  }

  // Legacy `categorie` → 301 to the configured public root (back-compat).
  if (head === DEFAULT_CATEGORY_ROOT) {
    return {
      redirectTo: `/${encodeURIComponent(lang)}/${encodeURIComponent(root)}${tail}`,
    };
  }

  return {};
}
