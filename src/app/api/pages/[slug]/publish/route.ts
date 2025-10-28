import { NextRequest, NextResponse } from 'next/server';
import { getPageVersions, updatePagePublishing } from '@/lib/db/pages';
import type { PageVersionTags } from '@/lib/types/blocks';
import { normalizeAttributes, normalizeValue } from '@/lib/page-context';

type PublishPayload = {
  versionNumber?: number | string;
  campaign?: string | null;
  segment?: string | null;
  attributes?: Record<string, string | undefined | null>;
  region?: string | null;
  language?: string | null;
  device?: string | null;
  priority?: number | string | null;
  isDefault?: boolean;
  activeFrom?: string | null;
  activeTo?: string | null;
  comment?: string | null;
  status?: 'draft' | 'published';
};

const toSummary = (version: any) => ({
  version: version.version,
  status: version.status,
  priority: version.priority ?? 0,
  isDefault: Boolean(version.isDefault),
  tags: version.tags ?? (version.tag ? { campaign: version.tag } : undefined),
  activeFrom: version.activeFrom ?? null,
  activeTo: version.activeTo ?? null,
  comment: version.comment ?? null,
  createdAt: version.createdAt,
  lastSavedAt: version.lastSavedAt,
  publishedAt: version.publishedAt,
  blocksCount: Array.isArray(version.blocks) ? version.blocks.length : 0
});

const parseBody = async (request: NextRequest): Promise<PublishPayload> => {
  try {
    const json = await request.json();
    return json ?? {};
  } catch {
    return {};
  }
};

const buildTags = (payload: PublishPayload): PageVersionTags | undefined => {
  const campaign = normalizeValue(payload.campaign);
  const segment = normalizeValue(payload.segment);
  const attributes = normalizeAttributes({
    ...(payload.attributes ?? {}),
    region: payload.region,
    language: payload.language,
    device: payload.device
  });

  const tags: PageVersionTags = {};
  if (campaign) tags.campaign = campaign;
  if (segment) tags.segment = segment;
  if (attributes) tags.attributes = attributes;
  return Object.keys(tags).length > 0 ? tags : undefined;
};

const respond = (body: any, status = 200) => NextResponse.json(body, { status });

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const versions = await getPageVersions(params.slug);
  if (!versions.length) {
    return respond({ slug: params.slug, versions: [] });
  }
  return respond({
    slug: params.slug,
    versions: versions.map((version) => toSummary(version))
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const payload = await parseBody(request);
  const versionNumber = Number(payload.versionNumber);

  if (!Number.isFinite(versionNumber)) {
    return respond({ error: 'versionNumber is required' }, 400);
  }

  const priority =
    payload.priority === null || payload.priority === undefined
      ? undefined
      : Number(payload.priority);

  if (priority !== undefined && !Number.isFinite(priority)) {
    return respond({ error: 'priority must be a number' }, 400);
  }

  const updated = await updatePagePublishing(params.slug, {
    versionNumber,
    tags: buildTags(payload),
    priority,
    isDefault: payload.isDefault,
    activeFrom: payload.activeFrom ?? undefined,
    activeTo: payload.activeTo ?? undefined,
    comment: payload.comment ?? undefined,
    status: payload.status
  });

  if (!updated) {
    return respond({ error: 'Version could not be updated' }, 404);
  }

  return respond({ success: true, version: toSummary(updated) });
}
