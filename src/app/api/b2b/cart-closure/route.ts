import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantApiConfig } from '@/lib/tenant';
import { sessionOwnedCustomerCodes } from '@/lib/profile/session-owner';
import { getMyMbErpClient } from '@/lib/erp/factory';

/**
 * Order-header info for the session's current cart — crucially, the ERP's
 * minimum-order rule (IMPMIN).
 *
 * IMPMIN is an order-HEADER rule, so it is not in GetPrezzaturaMultipla's
 * per-article promo rows; the only ERP call that exposes it is
 * GetInfoTestataOrdineXControlloChiusura, which takes an `IdCarrello`.
 *
 * SECURITY: that ERP call resolves the customer FROM THE CART, so it would
 * happily return another customer's totals and delivery codes for any cart id.
 * The cart id is therefore NEVER taken from the request body — it is derived
 * server-side from the Commerce Suite order, after checking that the order's
 * customer belongs to this session. The client sends only its `order_id`.
 *
 * Mirrors the legacy `looxb2b_ordine_minimo_spese_trasporto($id_carrello)`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body?.order_id ?? '').trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'order_id is required' },
        { status: 400 },
      );
    }

    const owned = await sessionOwnedCustomerCodes(request);
    if (!owned) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { pimApiUrl, tenantId } = await resolveTenantApiConfig(request);
    if (!pimApiUrl) {
      return NextResponse.json(
        { success: false, message: 'PIM API not configured' },
        { status: 500 },
      );
    }

    // Resolve the order server-side. This is what binds the ERP cart id to the
    // session — the client cannot nominate a cart it does not own.
    const res = await fetch(
      `${pimApiUrl.replace(/\/+$/, '')}/api/b2b/orders/${encodeURIComponent(orderId)}`,
      { headers: { Accept: 'application/json', 'X-Tenant-ID': tenantId } },
    );
    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Order lookup failed: ${res.status}` },
        { status: res.status },
      );
    }

    const order = (await res.json())?.order;
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 },
      );
    }

    if (!owned.has(String(order.customer_code ?? ''))) {
      return NextResponse.json(
        { success: false, message: 'Forbidden order' },
        { status: 403 },
      );
    }

    // The ERP cart id. `erp_cart_id` is what the cart-create hook mints when it
    // runs; `cart_number` is the Commerce Suite counter the ERP cart is keyed on
    // otherwise. Prefer the explicit one.
    const idCarrello = order.erp_cart_id ?? order.cart_number;
    if (idCarrello == null || idCarrello === '') {
      // No ERP cart for this order — there is nothing to ask the ERP about.
      // Report it rather than inventing a zero minimum, so the caller can tell
      // "no minimum configured" apart from "we never asked".
      return NextResponse.json(
        {
          success: false,
          code: 'NO_ERP_CART',
          message: 'Order has no ERP cart',
        },
        { status: 409 },
      );
    }

    const client = await getMyMbErpClient(request);
    const info = await client.getCartClosureInfo(idCarrello);

    return NextResponse.json({ success: true, data: info });
  } catch (error) {
    console.error('[b2b/cart-closure] failed:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 502 },
    );
  }
}
