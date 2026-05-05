import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The id segment is a base64url-encoded upstream URL. The player wraps
// every localStorage-configured station through this proxy so the browser
// always loads the audio over our HTTPS origin instead of HTTP shoutcast.
function decodeBase64UrlToString(value: string): string | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return decoded || null;
  } catch {
    return null;
  }
}

function resolveUpstream(id: string): string | null {
  const decoded = decodeBase64UrlToString(id);
  if (!decoded) return null;
  try {
    const url = new URL(decoded);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const upstreamUrl = resolveUpstream(id);
  if (!upstreamUrl) {
    return new NextResponse('Unknown radio station', { status: 404 });
  }

  // Some shoutcast/icecast servers reject default Node fetch UA — pretend to
  // be a browser so they return the audio stream instead of an HTML page.
  const upstream = await fetch(upstreamUrl, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; vinc-b2b-radio-proxy/1.0)',
      icy: 'metadata=0', // avoid ICY metadata frames in the stream
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new NextResponse(`Upstream error: ${upstream.status}`, {
      status: 502,
    });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'audio/mpeg',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'accept-ranges': 'none',
    },
  });
}
