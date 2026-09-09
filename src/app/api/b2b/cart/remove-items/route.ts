import { privateStorefrontRoute } from '@/lib/security/private-response';
import { NextRequest, NextResponse } from 'next/server';
import { DELETE as deleteOrder } from '@/app/api/proxy/pim/[...path]/route';

/**
 * POST /api/b2b/cart/remove-items
 * Proxies to commerce-suite DELETE /api/b2b/orders/{id}/items with body.
 * Avoids the unreliable DELETE-with-body through the generic proxy.
 *
 * Body: { order_id: string, line_numbers: number[] }
 */
async function post(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, line_numbers, external_refs } = body;

    if (
      typeof order_id !== 'string' ||
      !order_id ||
      /[\\/%?#\s]/.test(order_id) ||
      order_id === '.' ||
      order_id === '..'
    ) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 },
      );
    }
    const hasLineNumbers =
      Array.isArray(line_numbers) && line_numbers.length > 0;
    const hasExternalRefs =
      Array.isArray(external_refs) && external_refs.length > 0;
    if (!hasLineNumbers && !hasExternalRefs) {
      return NextResponse.json(
        { error: 'line_numbers or external_refs array is required' },
        { status: 400 },
      );
    }

    const forwarded = new NextRequest(req.url, {
      method: 'DELETE',
      headers: req.headers,
      body: JSON.stringify(
        hasLineNumbers ? { line_numbers } : { external_refs },
      ),
    });
    return deleteOrder(forwarded, {
      params: Promise.resolve({
        path: ['api', 'b2b', 'orders', order_id, 'items'],
      }),
    });
  } catch (error) {
    console.error('[cart/remove-items] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export const POST = privateStorefrontRoute(post);
