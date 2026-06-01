import { NextRequest, NextResponse } from 'next/server';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import {
  isProfileModel,
  probeModelAvailable,
  fetchModelRecord,
} from '@/lib/profile/vinc-data-models';

type RouteParams = { params: Promise<{ model: string; id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { model, id } = await params;
  if (!isProfileModel(model)) {
    return NextResponse.json(
      { error: `Unknown profile model: ${model}` },
      { status: 404 },
    );
  }

  const creds = await resolveCsCreds(req);
  const available = await probeModelAvailable(creds, model);
  if (!available) {
    return NextResponse.json({ available: false, item: null });
  }

  try {
    const item = await fetchModelRecord(creds, model, id);
    return NextResponse.json({ available: true, item });
  } catch (error) {
    console.error(`[profile route] ${model}/${id} failed:`, error);
    return NextResponse.json({ error: 'record fetch failed' }, { status: 502 });
  }
}
