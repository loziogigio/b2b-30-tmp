import { NextRequest, NextResponse } from 'next/server';
import { resolveCsCreds } from '@/lib/profile/cs-creds';
import { resolveStorefrontSession } from '@/lib/auth/storefront-session';
import { privateStorefrontRoute } from '@/lib/security/private-response';
import {
  profileCustomer,
  sessionOwnsProfileRecord,
} from '@/lib/profile/record-access';
import {
  isProfileModel,
  buildRecordsQuery,
  probeModelAvailable,
  fetchModelRecords,
  PROFILE_MODEL_DATE_FIELD,
} from '@/lib/profile/vinc-data-models';

type RouteParams = { params: Promise<{ model: string }> };

export const GET = privateStorefrontRoute(
  async (req: NextRequest, { params }: RouteParams) => {
    const { model } = await params;
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

    const sp = req.nextUrl.searchParams;
    if ([...sp.keys()].some((key) => sp.getAll(key).length !== 1)) {
      return NextResponse.json(
        { error: 'Duplicate query parameter' },
        { status: 400 },
      );
    }
    const relationId = sp.get('relation_id') ?? '';
    if (!relationId) {
      return NextResponse.json(
        { error: 'relation_id is required' },
        { status: 400 },
      );
    }

    if (!profileCustomer(session, relationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const query = buildRecordsQuery(
      {
        relation_id: relationId,
        status: sp.get('status') ?? undefined,
        date_from: sp.get('date_from') ?? undefined,
        date_to: sp.get('date_to') ?? undefined,
        document_number: sp.get('document_number') ?? undefined,
        page: sp.get('page') ? Number(sp.get('page')) : undefined,
        limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
        sort: sp.get('sort') ?? undefined,
      },
      PROFILE_MODEL_DATE_FIELD[model],
    );

    try {
      const creds = await resolveCsCreds(req);
      const available = await probeModelAvailable(creds, model, session.token);
      if (!available) return NextResponse.json({ available: false, items: [] });
      const { items, pagination } = await fetchModelRecords(
        creds,
        model,
        query,
        session.token,
      );
      // Reject the entire response, including totals, if upstream scope differs.
      if (
        !Array.isArray(items) ||
        items.some(
          (item) =>
            item?.relation_id !== relationId ||
            !sessionOwnsProfileRecord(session, model, item),
        )
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.json({ available: true, items, pagination });
    } catch (error) {
      console.error(`[profile route] ${model} records failed:`, error);
      return NextResponse.json(
        { error: 'records fetch failed' },
        { status: 502 },
      );
    }
  },
);
