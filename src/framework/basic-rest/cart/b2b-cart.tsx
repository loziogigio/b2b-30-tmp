// @framework/basic-rest/cart/b2b-cart.tsx
import { useQuery } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC } from '@framework/utils/static';

import { useEffect, useRef } from 'react';
import { useCart } from '@contexts/cart/cart.context';
import { mapServerCartToItems } from '@utils/adapter/cart-adapter';

// ===============================
// Fetch Cart from API
// ===============================

export const fetchCart = async () => {
  const response = await post<any>(
    API_ENDPOINTS_B2B.GET_CART,   // make sure CART is defined in your endpoints
    {
      id_cart: ERP_STATIC.id_cart,
      client_id: ERP_STATIC.customer_code,
      address_code: ERP_STATIC.address_code,
      username:ERP_STATIC.username,
      ext_call:ERP_STATIC.ext_call
    }
  );

  return response;
};

// ===============================
// React Query Hook
// ===============================

export const useCartQuery = () => {
  return useQuery<any, Error>({
    queryKey: ['b2b-cart'],
    queryFn: fetchCart,
  });
};

export default function CartHydrator() {
    const { data, isSuccess } = useCartQuery();
    const { hydrateFromServer } = useCart();
    const hydratedRef = useRef(false);
  
    useEffect(() => {
      if (!isSuccess || hydratedRef.current) return;
      const items = mapServerCartToItems(data);
      hydrateFromServer(items, 'replace'); // or 'merge'
      hydratedRef.current = true;
    }, [isSuccess, data, hydrateFromServer]);
  
    return null; // invisible
  }
