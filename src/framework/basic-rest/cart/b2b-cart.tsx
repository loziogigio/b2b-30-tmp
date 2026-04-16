'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  get as pimGet,
  post as pimPost,
  patch as pimPatch,
  del as pimDel,
} from '@framework/utils/httpPIM';
import { CS_CART } from '@framework/utils/api-endpoints-cs';
import { ERP_STATIC, setErpStatic } from '@framework/utils/static';
import { useCart } from '@contexts/cart/cart.context';
import {
  mapCSOrderToCart,
  buildAddItemRequest,
} from '@utils/adapter/cart-adapter';
import type { CartSummary, Item } from '@contexts/cart/cart.utils';
import { AddToCartInput } from '@utils/transform/cart';
import { useUI } from '@contexts/ui.context';
import { getAuthToken } from '@/lib/auth';

function cartFetch(url: string, body: Record<string, any>) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
}

// ----- ensure active cart -----

export async function ensureActiveCart(): Promise<string> {
  const res = await pimPost<any>(CS_CART.ACTIVE, {
    customer_code: ERP_STATIC.customer_code,
    address_code: ERP_STATIC.address_code,
    channel: 'b2b',
  });
  const orderId = res.cart_id || res.order_id;
  setErpStatic({ vinc_order_id: orderId });
  return orderId;
}

async function getOrderId(): Promise<string> {
  if (ERP_STATIC.vinc_order_id) return ERP_STATIC.vinc_order_id;
  return ensureActiveCart();
}

// ----- fetch cart -----

export interface FetchCartOptions {
  cartId?: string | number;
  customerCode?: string;
  addressCode?: string;
  username?: string;
}

export const fetchCartData = async (
  options?: FetchCartOptions,
): Promise<{ items: Item[]; summary: CartSummary }> => {
  // Always go through cart/active to get or create a valid draft cart,
  // following the same pattern as dfl-b2b's getCartList.
  const orderId = options?.cartId
    ? String(options.cartId)
    : await ensureActiveCart();

  const res = await pimGet<any>(CS_CART.ORDER(orderId), { limit: 500 });
  return mapCSOrderToCart(res);
};

export const useCartQuery = () => {
  const { isAuthorized } = useUI();
  const enabled =
    isAuthorized && !!ERP_STATIC.customer_code && !!ERP_STATIC.address_code;
  return useQuery({
    queryKey: ['b2b-cart'],
    queryFn: () => fetchCartData(),
    enabled,
    refetchOnMount: enabled ? 'always' : false,
    refetchOnWindowFocus: enabled,
    staleTime: 0,
  });
};

// ----- delete cart -----

export async function deleteCart(idCart: number | string) {
  const orderId = String(idCart) || (await getOrderId());
  const res = await cartFetch('/api/b2b/cart/delete', { order_id: orderId });
  if (!res.ok) throw new Error(`Delete cart failed: ${res.status}`);
  return res.json();
}

// ----- add / update / remove cart item -----

/**
 * Add / Update / Remove cart line via commerce-suite API.
 * - quantity === 0  → REMOVE matching row(s)
 * - quantity  >  0  → UPDATE if match, else ADD
 */
export async function addOrUpdateCartItem(
  input: AddToCartInput,
  cartItems: Item[],
  summary: CartSummary | null | undefined,
  sourceItem?: Item,
) {
  if (input.quantity == null || Number.isNaN(Number(input.quantity))) {
    return { status: 'exception', msg: 'no-valid-quantity' };
  }
  if (input.quantity < 0) {
    return { status: 'exception', msg: 'negative-quantity-not-allowed' };
  }

  const orderId = summary?.orderId || (await getOrderId());

  // Find matches by entity_code + promo identity
  const inputId = String(input.item_id);
  const inputPromoCode = String(input.promo_code ?? 0);
  const inputPromoRow = String(input.promo_row ?? 0);

  const matches = cartItems.filter((it) => {
    return (
      String(it.id) === inputId &&
      String(it.promo_code ?? 0) === inputPromoCode &&
      String(it.promo_row ?? 0) === inputPromoRow
    );
  });

  // --- REMOVE when quantity === 0 ---
  if (input.quantity === 0) {
    if (matches.length === 0) {
      return { status: 'not-found', msg: 'no-matching-row' };
    }
    const lineNumbers = matches
      .map((it) => Number(it.rowId))
      .filter((n) => !isNaN(n));

    // Build remove payload: prefer line_numbers, fall back to external_refs (entity_codes)
    const removeBody: Record<string, any> = { order_id: orderId };
    if (lineNumbers.length > 0) {
      removeBody.line_numbers = lineNumbers;
    } else {
      removeBody.external_refs = matches.map((it) => String(it.id));
    }

    // Use dedicated cart API route (DELETE with body via generic proxy is unreliable)
    const res = await cartFetch('/api/b2b/cart/remove-items', removeBody);
    if (!res.ok) throw new Error(`Remove items failed: ${res.status}`);
    return res.json();
  }

  // --- UPDATE if match exists ---
  if (matches.length > 0) {
    const items = matches.map((it) => {
      const patch: Record<string, any> = {
        line_number: Number(it.rowId),
        quantity: input.quantity,
      };
      if (input.note !== undefined) patch.note = input.note;
      return patch;
    });
    return pimPatch(CS_CART.ITEMS(orderId), { items });
  }

  // --- ADD if no match ---
  const addBody = buildAddItemRequest(input, sourceItem);
  return pimPost(CS_CART.ITEMS(orderId), addBody);
}

// ----- update line note -----

export async function updateLineNote(
  lineNumber: number | string,
  note: string,
  summary: CartSummary | null | undefined,
) {
  const orderId = summary?.orderId || (await getOrderId());
  return pimPatch(CS_CART.ITEMS(orderId), {
    items: [{ line_number: Number(lineNumber), note }],
  });
}

// ----- hydrator -----

export default function CartHydrator() {
  const { data, isSuccess } = useCartQuery();
  const { hydrateFromServer, setCartSummary } = useCart();
  useEffect(() => {
    if (!isSuccess || !data) return;
    hydrateFromServer(data.items, 'replace');
    setCartSummary(data.summary);
  }, [isSuccess, data, hydrateFromServer, setCartSummary]);
  return null;
}
