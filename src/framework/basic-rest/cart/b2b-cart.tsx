'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC } from '@framework/utils/static';
import { useCart } from '@contexts/cart/cart.context';
import { mapServerCart } from '@utils/adapter/cart-adapter';
import type { CartSummary, Item } from '@contexts/cart/cart.utils';
import { AddToCartInput } from '@utils/transform/cart';

// ----- fetch cart  -----
export const fetchCartData = async (): Promise<{ items: Item[]; summary: CartSummary }> => {
  const res = await post<any>(API_ENDPOINTS_B2B.GET_CART, {
    id_cart: ERP_STATIC.id_cart,
    client_id: ERP_STATIC.customer_code,
    address_code: ERP_STATIC.address_code,
    username: ERP_STATIC.username,
    ext_call: ERP_STATIC.ext_call,
  });
  return mapServerCart(res);
};

export const useCartQuery = () =>
  useQuery({
    queryKey: ['b2b-cart'],
    queryFn: fetchCartData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });


// simplified line matcher (no normalize, direct equality as requested)
const sameLine = (item: Item, payload: AddToCartInput) => {
  return (
    // product identity
    (item as any).id == payload.item_id &&
    // promo identity
    payload.promo_code == (item as any).promo_code &&
    payload.promo_row == (item as any).promo_row
  );
};

/**
 * Add or update cart line:
 * - If a matching line exists → /wrapper/update_cart with cart_rows[]
 * - Else → /wrapper/add_to_cart or /wrapper/add_to_cart_promo with FULL BODY like your examples
 */
export async function addOrUpdateCartItem(
  input: AddToCartInput,
  cartItems: Item[],
  summary: CartSummary | null | undefined,
  sourceItem?: Item // optional: pass the product's Item (to derive prices/discounts if needed)
) {
  // guard
  if (!(input.quantity > 0)) {
    return { status: 'exception', msg: 'no-valid-quantity' };
  }

  // common identity
  const id_cart = summary?.idCart ?? 0;
  const base = {
    id_cart,
    client_id: ERP_STATIC.customer_code,
    address_code: ERP_STATIC.address_code,
    ext_call: ERP_STATIC.ext_call,
  };

  // if line exists → UPDATE
  const matches = cartItems.filter((it) => sameLine(it, input));
  if (matches.length > 0) {
    const cart_rows = matches.map((it) => ({
      row_id: (it as any).rowId ?? (it as any).row_id ?? (it as any).id, // server row id
      quantity: input.quantity,
      qty_min_packing:
        input.qty_min_packing ??
        (it as any).qty_min_packing ??
        (it as any).qty_min_imballo ??
        (it as any).__cartMeta?.qty_min_imballo,
      promo_code: input.promo_code ?? (it as any).promo_code ?? 0,
      promo_row: input.promo_row ?? (it as any).promo_row ?? 0,
    }));

    return post(API_ENDPOINTS_B2B.UPDATE_CART, {
      ...base,
      cart_rows,
    });
  }

  // else → ADD
  const body = {
    ...base,
    item_id: input.item_id,
    quantity: input.quantity,

    // prices
    price: input.price ?? 0,
    price_discount: input.price_discount ?? 0,
    vat_perc: input.vat_perc ?? 0,

    // discounts (default 0 to mirror your example)
    discount1: input.discount1 ?? 0,
    discount2: input.discount2 ?? 0,
    discount3: input.discount3 ?? 0,
    discount4: input.discount4 ?? 0,
    discount5: input.discount5 ?? 0,
    discount6: input.discount6 ?? 0,

    // packaging + list
    qty_min_packing: input.qty_min_packing ?? 1,
    listino_type: input.listino_type ?? '1',
    listino_code: input.listino_code ?? 'VEND',

    // promo identity (use 0 when not promo, to match your non-promo example)
    promo_code: input.promo_code ?? 0,
    promo_row: input.promo_row ?? 0,
  };

  // choose endpoint
  if (body.promo_code && String(body.promo_code) !== '0') {
    return post(API_ENDPOINTS_B2B.ADD_TO_CART_PROMO, body);
  }
  return post(API_ENDPOINTS_B2B.ADD_TO_CART, body);
}

// ----- hydrator  -----
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
