// src/framework/order/fetch-order.ts
import { useQuery } from '@tanstack/react-query';

import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import {
  transformOrder,
  TransformedOrder,
  RawOrderResponse,
} from '@utils/transform/b2b-order';
import { fetchProfileRecord } from '@framework/profile/vinc-profile-client';
import {
  vincOrderDetailToTransformed,
  type VincOrderRecord,
} from '@utils/transform/vinc-historical-order';

// map your friendly params to ERP keys
export type OrderParams = {
  doc_number?: string; // NumeroDocDefinitivo (ERP)
  cause?: string; // CausaleDocDefinitivo (ERP)
  doc_year?: string; // AnnoDocDefinitivo (ERP)
  vincId?: string; // VINC record _id (default theme)
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
  // VINC detail by _id (default theme)
  if (params.vincId) {
    const { available, item } = await fetchProfileRecord(
      'historical_order',
      params.vincId,
    );
    if (!available || !item) {
      throw new Error('Order not found.');
    }
    return vincOrderDetailToTransformed(item as VincOrderRecord);
  }

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
