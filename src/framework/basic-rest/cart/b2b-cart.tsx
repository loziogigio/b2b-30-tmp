'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC } from '@framework/utils/static';
import { useCart } from '@contexts/cart/cart.context';
import { mapServerCart } from '@utils/adapter/cart-adapter';
import { sameLine, type CartSummary, type Item } from '@contexts/cart/cart.utils';
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


// delete the whole cart (id_cart)
export async function deleteCart(id_cart: number | string){
  const base = {
    id_cart,
    client_id: ERP_STATIC.customer_code,
    address_code: ERP_STATIC.address_code,
    ext_call: ERP_STATIC.ext_call,
  };
  // if your DELETE_CART also accepts row_id, you can add it optionally
  return post(API_ENDPOINTS_B2B.DELETE_CART, {
    ...base,
    id_cart: String(id_cart),
  });
};

/**
 * Add or update cart line:
 * - If a matching line exists → /wrapper/update_cart with cart_rows[]
 * - Else → /wrapper/add_to_cart or /wrapper/add_to_cart_promo with FULL BODY like your examples
 */
// helper to extract the server row id
const getRowId = (it: any) => it.rowId ?? it.row_id ;

/**
 * Add / Update / Remove cart line
 * - quantity === 0  → REMOVE matching row(s)
 * - quantity  >  0  → UPDATE if match, else ADD
 */
export async function addOrUpdateCartItem(
  input: AddToCartInput,
  cartItems: Item[],
  summary: CartSummary | null | undefined,
  sourceItem?: Item
) {
  // basic guards
  if (input.quantity == null || Number.isNaN(Number(input.quantity))) {
    return { status: 'exception', msg: 'no-valid-quantity' };
  }
  if (input.quantity < 0) {
    return { status: 'exception', msg: 'negative-quantity-not-allowed' };
  }

  const id_cart = summary?.idCart ?? 0;
  const base = {
    id_cart,
    client_id: ERP_STATIC.customer_code,
    address_code: ERP_STATIC.address_code,
    ext_call: ERP_STATIC.ext_call,
  };

  // Find matches first (id + promo_code + promo_row per your simplified matcher)
  const matches = cartItems.filter((it) => sameLine(it, input));

  // --- REMOVE when quantity === 0 ---
  if (input.quantity === 0) {
    if (matches.length === 0) {
      return { status: 'not-found', msg: 'no-matching-row' };
    }

    // one POST per row, with the exact payload shape you specified
    const removes = matches.map((it) =>
      post(API_ENDPOINTS_B2B.REMOVE_CART_ITEM, {
        ...base,
        row_id: String(getRowId(it)),
        id_cart: String(id_cart),
      })
    );

    // Return single result if one row, otherwise all results
    return removes.length === 1 ? removes[0] : Promise.all(removes);
  }



  if (matches.length > 0) {
    const cart_rows = matches.map((it) => ({
      row_id: getRowId(it),
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

  // --- ADD if no match ---
  const body = {
    ...base,
    item_id: input.item_id,
    quantity: input.quantity,

    // prices
    price: input.price ?? 0,
    price_discount: input.price_discount ?? 0,
    vat_perc: input.vat_perc ?? 0,

    // discounts
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

    // promo identity
    promo_code: input.promo_code ?? 0,
    promo_row: input.promo_row ?? 0,
  };

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
