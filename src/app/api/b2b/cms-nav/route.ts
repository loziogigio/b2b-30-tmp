import { NextRequest, NextResponse } from 'next/server';
import { getCachedCmsPageRegistry } from '@/lib/db/cms-pages';
import type { CmsPageRegistryEntry } from '@/lib/db/cms-pages';

/** Shape returned to client nav consumers. */
export interface CmsNavPage {
  slug: string;
  title: string;
  lang: string;
}

/**
 * GET /api/b2b/cms-nav?lang=it
 *
 * Returns CMS pages that should appear in the storefront navigation,
 * filtered to the requested language and limited to `show_in_nav=true`
 * entries. Results are already sorted by `sort_order` (registry default).
 *
 * Legacy safety: pages with no `lang` set are shown only for the default
 * language ("it"). After a full backfill every page has a lang, so this
 * is a transitional guard only.
 *
 * Fails soft to [] so nav components remain functional when the registry
 * is temporarily unreachable.
 */
export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get('lang')?.trim().toLowerCase() ?? '';

  try {
    const registry: CmsPageRegistryEntry[] =
      await getCachedCmsPageRegistry();

    const DEFAULT_LANG = 'it';
    const navPages: CmsNavPage[] = registry
      .filter(
        (p) =>
          p.show_in_nav &&
          (!p.lang ? lang === DEFAULT_LANG : p.lang === lang),
      )
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        lang: p.lang ?? DEFAULT_LANG,
      }));

    return NextResponse.json(navPages);
  } catch {
    return NextResponse.json([] as CmsNavPage[]);
  }
}
