// src/framework/order/fetch-order.ts
import { useQuery } from '@tanstack/react-query';

import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { erpApiPath } from '@framework/utils/erp-api-base';
import { useThemeId } from '@/contexts/tenant.context';
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
  // ERP customer context — required for the direct-MyMB (time) detail flow,
  // which re-reads the order from GetTestateConInfoConsegna to find its rows.
  customer_code?: string;
  address_code?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
};

function toErpPayload(params: OrderParams) {
  return {
    NumeroDocDefinitivo: params.doc_number,
    CausaleDocDefinitivo: params.cause,
    AnnoDocDefinitivo: params.doc_year,
    customer_code: params.customer_code,
    address_code: params.address_code,
    type: params.type,
    date_from: params.date_from,
    date_to: params.date_to,
    ext_call: true,
  };
}

export async function fetchOrderDetails(
  params: OrderParams,
  theme?: string,
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

  // time theme → in-app direct-ERP route (/api/erp/get_order_detail), mirroring
  // the order list. Other themes → legacy proxy hub (post() prefixes
  // /api/proxy/b2b → the Drupal-style wrapper/get_order_detail).
  let res: RawOrderResponse;
  if (theme === 'time') {
    const httpRes = await fetch(erpApiPath('time', '/erp/get_order_detail'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!httpRes.ok) {
      throw new Error('Order not found or ERP error.');
    }
    res = await httpRes.json();
  } else {
    res = await post<RawOrderResponse>(
      API_ENDPOINTS_B2B.GET_ORDER_DETAIL,
      payload,
    );
  }

  if (!res?.success || !res?.message) {
    // Keep consistent with your product code error handling
    throw new Error('Order not found or ERP error.');
  }

  return transformOrder(res);
}

export const useOrderDetailsQuery = (params: OrderParams, enabled = true) => {
  const theme = useThemeId();
  return useQuery<TransformedOrder, Error>({
    queryKey: [API_ENDPOINTS_B2B.GET_ORDER_DETAIL, theme, params],
    queryFn: () => fetchOrderDetails(params, theme),
    enabled,
  });
};
