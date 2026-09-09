import { privateStorefrontRoute } from '@/lib/security/private-response';
import { NextRequest, NextResponse } from 'next/server';
import { DELETE as deleteOrder } from '@/app/api/proxy/pim/[...path]/route';

/**
 * POST /api/b2b/cart/delete
 * Proxies to commerce-suite DELETE /api/b2b/orders/{id}.
 *
 * Body: { order_id: string }
 */
async function post(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id } = body;

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

    const forwarded = new NextRequest(req.url, {
      method: 'DELETE',
      headers: req.headers,
    });
    return deleteOrder(forwarded, {
      params: Promise.resolve({ path: ['api', 'b2b', 'orders', order_id] }),
    });
  } catch (error) {
    console.error('[cart/delete] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export const POST = privateStorefrontRoute(post);
