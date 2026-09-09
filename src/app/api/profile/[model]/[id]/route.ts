import { NextRequest, NextResponse } from 'next/server';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import { resolveStorefrontSession } from '@/lib/auth/storefront-session';
import { privateStorefrontRoute } from '@/lib/security/private-response';
import {
  isProfileRecordId,
  sessionOwnsProfileRecord,
} from '@/lib/profile/record-access';
import {
  isProfileModel,
  probeModelAvailable,
  fetchModelRecord,
} from '@/lib/profile/vinc-data-models';

type RouteParams = { params: Promise<{ model: string; id: string }> };

export const GET = privateStorefrontRoute(
  async (req: NextRequest, { params }: RouteParams) => {
    const { model, id } = await params;
    if (!isProfileModel(model)) {
      return NextResponse.json(
        { error: `Unknown profile model: ${model}` },
        { status: 404 },
      );
    }

    const session = await resolveStorefrontSession(req);
    if (!session)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    if (!isProfileRecordId(id))
      return NextResponse.json({ error: 'Invalid record ID' }, { status: 400 });

    try {
      const creds = await resolveCsCreds(req);
      const available = await probeModelAvailable(creds, model, session.token);
      if (!available)
        return NextResponse.json({ available: false, item: null });
      const item = await fetchModelRecord(creds, model, id, session.token);
      if (item && !sessionOwnsProfileRecord(session, model, item)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.json({ available: true, item });
    } catch (error) {
      console.error(`[profile route] ${model}/${id} failed:`, error);
      return NextResponse.json(
        { error: 'record fetch failed' },
        { status: 502 },
      );
    }
  },
);
