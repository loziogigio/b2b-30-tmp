import { NextRequest, NextResponse } from 'next/server';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import {
  isProfileModel,
  buildRecordsQuery,
  probeModelAvailable,
  fetchModelRecords,
} from '@/lib/profile/vinc-data-models';

type RouteParams = { params: Promise<{ model: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { model } = await params;
  if (!isProfileModel(model)) {
    return NextResponse.json(
      { error: `Unknown profile model: ${model}` },
      { status: 404 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const relationId = sp.get('relation_id') ?? '';
  if (!relationId) {
    return NextResponse.json(
      { error: 'relation_id is required' },
      { status: 400 },
    );
  }

  const creds = await resolveCsCreds(req);

  const available = await probeModelAvailable(creds, model);
  if (!available) {
    return NextResponse.json({ available: false, items: [] });
  }

  const query = buildRecordsQuery({
    relation_id: relationId,
    status: sp.get('status') ?? undefined,
    date_from: sp.get('date_from') ?? undefined,
    date_to: sp.get('date_to') ?? undefined,
    document_number: sp.get('document_number') ?? undefined,
    page: sp.get('page') ? Number(sp.get('page')) : undefined,
    limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
    sort: sp.get('sort') ?? undefined,
  });

  try {
    const { items, pagination } = await fetchModelRecords(creds, model, query);
    return NextResponse.json({ available: true, items, pagination });
  } catch (error) {
    console.error(`[profile route] ${model} records failed:`, error);
    return NextResponse.json(
      { error: 'records fetch failed' },
      { status: 502 },
    );
  }
}
