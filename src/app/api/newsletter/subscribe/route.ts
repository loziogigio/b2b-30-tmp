import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant, isSingleTenant } from '@/lib/tenant';
import { isValidEmail } from '@/lib/email';

/**
 * POST /api/newsletter/subscribe
 *
 * Best-effort newsletter signup used by the site footer. It validates the
 * email, records the intent server-side (where a real mailing-list
 * integration can be wired later) and always responds 2xx so the footer UX
 * never surfaces a hard failure. The body is `{ email: string }`.
 *
 * TODO: forward to the tenant's mailing-list provider / PIM newsletter store
 *       once that exists. For now this just logs the request.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Invalid email address' },
      { status: 400 },
    );
  }

  let tenantId = 'single';
  if (!isSingleTenant) {
    const hostname =
      req.headers.get('x-tenant-hostname') ||
      req.headers.get('host') ||
      'localhost';
    const tenant = await resolveTenant(hostname).catch(() => null);
    tenantId = tenant?.id ?? 'unknown';
  }

  console.info('[newsletter:subscribe]', { tenantId, email });

  return NextResponse.json({ ok: true });
}
