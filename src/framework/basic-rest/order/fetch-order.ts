// src/framework/order/fetch-order.ts
import { useQuery } from '@tanstack/react-query';

import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import {
  transformOrder,
  TransformedOrder,
  RawOrderResponse,
} from '@utils/transform/b2b-order';

// map your friendly params to ERP keys
export type OrderParams = {
  doc_number: string; // NumeroDocDefinitivo
  cause: string; // CausaleDocDefinitivo
  doc_year: string; // AnnoDocDefinitivo
};

function toErpPayload(params: OrderParams) {
  return {
    NumeroDocDefinitivo: params.doc_number,
    CausaleDocDefinitivo: params.cause,
    AnnoDocDefinitivo: params.doc_year,
    ext_call: true,
  };
}

export async function fetchOrderDetails(
  params: OrderParams,
): Promise<TransformedOrder> {
  const payload = toErpPayload(params);
  const res = await post<RawOrderResponse>(
    API_ENDPOINTS_B2B.GET_ORDER_DETAIL,
    payload,
  );

  if (!res?.success || !res?.message) {
    // Keep consistent with your product code error handling
    throw new Error('Order not found or ERP error.');
  }

  return transformOrder(res);
}

export const useOrderDetailsQuery = (params: OrderParams, enabled = true) =>
  useQuery<TransformedOrder, Error>({
    queryKey: [API_ENDPOINTS_B2B.GET_ORDER_DETAIL, params],
    queryFn: () => fetchOrderDetails(params),
    enabled,
  });
