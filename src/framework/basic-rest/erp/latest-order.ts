import { useQuery } from '@tanstack/react-query';
import type { LatestOrderHistory } from '@utils/transform/erp-latest-order';

const ENDPOINT = '/api/erp/get_latest_order_by_item';

const EMPTY: LatestOrderHistory = { fromDate: '', rows: [] };

export type LatestOrderQuery = {
  /** The customer's ERP `CodiceInterno` — `ERP_STATIC.customer_code`. */
  customerCode: string;
  /** The article's `CodiceInternoArticolo` — `ErpPriceData.entity_code`. */
  entityCode: string;
};

/**
 * This customer's order history for one article, for the "già ordinato" popup.
 *
 * Always goes through the in-app ERP route, which holds the tenant's MyMB
 * credentials and checks that the session actually owns `customerCode`.
 *
 * An empty history is a normal answer, not a failure: MyMB cannot tell us
 * apart "never ordered" from "unknown code", so both arrive here as an empty
 * row list.
 */
export async function fetchLatestOrderByItem({
  customerCode,
  entityCode,
}: LatestOrderQuery): Promise<LatestOrderHistory> {
  if (!customerCode || !entityCode) return { ...EMPTY };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_code: customerCode,
      entity_code: entityCode,
    }),
  });
  if (!res.ok) {
    throw new Error(`Latest-order request failed: HTTP ${res.status}`);
  }

  const json = await res.json();
  const data = json?.data;
  return {
    fromDate: String(data?.fromDate ?? ''),
    rows: Array.isArray(data?.rows) ? data.rows : [],
  };
}

export function useLatestOrderByItem(
  input: LatestOrderQuery & { enabled?: boolean },
) {
  const { customerCode, entityCode, enabled = true } = input;
  return useQuery<LatestOrderHistory>({
    queryKey: ['latest-order-by-item', customerCode, entityCode],
    queryFn: () => fetchLatestOrderByItem({ customerCode, entityCode }),
    enabled: enabled && !!customerCode && !!entityCode,
    staleTime: 5 * 60 * 1000,
  });
}
