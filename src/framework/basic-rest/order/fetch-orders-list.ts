// src/framework/order/fetch-orders-list.ts
import { useQuery } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { OrdersListParams, OrderSummary, RawOrderListItem } from '@framework/order/types-b2b-orders-list';
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

export async function fetchOrdersList(params: OrdersListParams): Promise<OrderSummary[]> {
    const payload = toErpPayload(params);

    // The response is an array of RawOrderListItem (per your sample)
    const res = await post<RawOrderListItem[]>(API_ENDPOINTS_B2B.GET_ORDERS, payload);

    if (!Array.isArray(res)) {
        throw new Error('Unexpected ERP response for orders list.');
    }
    return transformOrdersList(res);
}


export const useOrdersListQuery = (params: OrdersListParams, enabled = true) =>
    useQuery<OrderSummary[], Error>({
        queryKey: [API_ENDPOINTS_B2B.GET_ORDERS, params],
        queryFn: () => fetchOrdersList(params),
        enabled,
    });