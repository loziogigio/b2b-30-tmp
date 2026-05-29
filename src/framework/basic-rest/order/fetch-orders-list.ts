// src/framework/order/fetch-orders-list.ts
import { useQuery } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { erpApiPath } from '@framework/utils/erp-api-base';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { useThemeId } from '@/contexts/tenant.context';
import {
  OrdersListParams,
  OrderSummary,
  RawOrderListItem,
} from '@framework/order/types-b2b-orders-list';
import { transformOrdersList } from '@utils/transform/b2b-orders-list';

// If you want to keep the friendly names as-is, just pass them straight through.
// Otherwise, map them here if your ERP expects different keys (it looks like it already matches).
function toErpPayload(params: OrdersListParams) {
  return {
    date_from: params.date_from,
    date_to: params.date_to,
    customer_code: params.customer_code,
    type: params.type,
    address_code: params.address_code,
  };
}

export async function fetchOrdersList(
  params: OrdersListParams,
  theme?: string,
): Promise<OrderSummary[]> {
  const payload = toErpPayload(params);

  // time theme → in-app direct-ERP route (/api/erp/get_orders), mirroring
  // prices. Other themes → legacy proxy endpoint (post() prefixes /api/proxy/b2b).
  let raw: { message?: RawOrderListItem[] } | RawOrderListItem[];
  if (theme === 'time') {
    const httpRes = await fetch(erpApiPath('time', '/erp/get_orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!httpRes.ok) {
      throw new Error(`ERP orders request failed: HTTP ${httpRes.status}`);
    }
    const json = await httpRes.json();
    // Route shape: { status: 'success', data: ListaTestateConInfoConsegna }
    raw = json?.data ?? json;
  } else {
    raw = await post<{ message?: RawOrderListItem[] } | RawOrderListItem[]>(
      API_ENDPOINTS_B2B.GET_ORDERS,
      payload,
    );
  }

  // Handle both wrapped (message: [...]) and direct ([...]) response formats
  const res: RawOrderListItem[] | undefined = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as any)?.message)
      ? (raw as any).message
      : undefined;

  if (!Array.isArray(res)) {
    throw new Error('Unexpected ERP response for orders list.');
  }
  return transformOrdersList(res);
}

export const useOrdersListQuery = (
  params: OrdersListParams,
  enabled = true,
) => {
  const theme = useThemeId();
  return useQuery<OrderSummary[], Error>({
    queryKey: [
      API_ENDPOINTS_B2B.GET_ORDERS,
      params.date_from,
      params.date_to,
      params.customer_code,
    ],
    queryFn: () => fetchOrdersList(params, theme),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });
};
