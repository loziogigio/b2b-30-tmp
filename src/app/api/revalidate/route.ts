import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { tagsForNames, currentTenantId } from '@/lib/cache/tags';

/**
 * POST /api/revalidate
 *
 * On-demand cache flush for manual / CI purges (the Redis subscriber handles
 * the automatic admin-publish path). Requires a shared secret in the
 * `x-revalidate-secret` header or `?secret=`.
 *
 * Body / query:
 *   tags:     string[] / `?tags=a,b`   — verbatim cache tags to revalidate
 *   names:    string[] / `?names=a,b`  — cache-name keys mapped to tenant-scoped tags
 *   tenantId: string                   — tenant for `names` (defaults to current request's tenant)
 *   paths:    string[]                 — paths to revalidate
 */
function listFromQuery(req: NextRequest, key: string): string[] {
  const raw = new URL(req.url).searchParams.get(key);
  return raw
    ? raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'REVALIDATE_SECRET not configured' },
      { status: 503 },
    );
  }
  const provided =
    req.headers.get('x-revalidate-secret') ||
    new URL(req.url).searchParams.get('secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    tags?: string[];
    names?: string[];
    tenantId?: string;
    paths?: string[];
  };

  const explicitTags = [...(body.tags ?? []), ...listFromQuery(req, 'tags')];
  const names = [...(body.names ?? []), ...listFromQuery(req, 'names')];
  const tenantId =
    body.tenantId || (names.length ? await currentTenantId() : '');
  const mappedTags = names.length ? tagsForNames(names, tenantId) : [];
  const tags = [...new Set([...explicitTags, ...mappedTags])];
  const paths = body.paths ?? [];

  for (const tag of tags) {
    try {
      revalidateTag(tag);
    } catch {
      /* ignore unknown tag */
    }
  }
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      /* ignore unknown path */
    }
  }

  return NextResponse.json({ revalidated: true, tags, paths });
}
