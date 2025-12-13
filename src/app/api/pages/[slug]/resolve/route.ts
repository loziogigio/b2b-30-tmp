import { NextRequest, NextResponse } from 'next/server';
import { resolvePageVersion } from '@/lib/db/pages';
import type { PageVersionTags } from '@/lib/types/blocks';
import { normalizeAttributes, normalizeValue } from '@/lib/page-context';

type ResolvePayload = {
  campaign?: string | null;
  segment?: string | null;
  tag?: string | null;
  homeTag?: string | null;
  templateTag?: string | null;
  attributes?: Record<string, string | undefined | null>;
  region?: string | null;
  language?: string | null;
  device?: string | null;
  preview?: boolean;
  includeDraft?: boolean;
};

const extractTags = (payload: ResolvePayload): PageVersionTags | undefined => {
  const campaign =
    normalizeValue(payload.campaign) ||
    normalizeValue(payload.tag) ||
    normalizeValue(payload.homeTag) ||
    normalizeValue(payload.templateTag);
  const segment = normalizeValue(payload.segment);
  const attributes = normalizeAttributes({
    ...(payload.attributes ?? {}),
    region: payload.region,
    language: payload.language,
    device: payload.device,
  });

  const tags: PageVersionTags = {};
  if (campaign) tags.campaign = campaign;
  if (segment) tags.segment = segment;
  if (attributes) tags.attributes = attributes;

  return Object.keys(tags).length > 0 ? tags : undefined;
};

const parseBody = async (request: NextRequest): Promise<ResolvePayload> => {
  try {
    const json = await request.json();
    return json ?? {};
  } catch {
    return {};
  }
};

const parseQuery = (request: NextRequest): ResolvePayload => {
  const search = request.nextUrl.searchParams;
  return {
    campaign: search.get('campaign'),
    segment: search.get('segment'),
    tag: search.get('tag'),
    homeTag: search.get('homeTag'),
    templateTag: search.get('templateTag'),
    region: search.get('region'),
    device: search.get('device'),
    language: search.get('language'),
    preview: search.get('preview') === 'true',
    includeDraft: search.get('includeDraft') === 'true',
  };
};

const respond = (data: any, status = 200) =>
  NextResponse.json(data, { status });

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const payload = await parseBody(request);
  const tags = extractTags(payload);
  const includeDraft =
    payload.preview === true || payload.includeDraft === true;

  const version = await resolvePageVersion(params.slug, {
    tags,
    includeDraft,
    respectActiveWindow: true,
  });

  if (!version) {
    return respond({ success: false, error: 'Page or version not found' }, 404);
  }

  return respond({ success: true, data: version });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const payload = parseQuery(request);
  const tags = extractTags(payload);
  const includeDraft =
    payload.preview === true || payload.includeDraft === true;

  const version = await resolvePageVersion(params.slug, {
    tags,
    includeDraft,
    respectActiveWindow: true,
  });

  if (!version) {
    return respond({ success: false, error: 'Page or version not found' }, 404);
  }

  return respond({ success: true, data: version });
}
