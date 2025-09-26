import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC, setErpStatic } from '@framework/utils/static';

export type SavedCartStatus = 'A' | 'S' | string;

export interface SavedCartSummary {
  cartId: number;
  label: string;
  status: SavedCartStatus;
  netTotal: number;
  grossTotal: number;
  vatTotal: number;
  documentTotal: number;
  deliveryDate?: string | null;
  updatedAt?: string | null;
}

interface SavedCartListResponse {
  data: Array<{
    customer_code: string;
    cart_id: number;
    address_code: string;
    status: SavedCartStatus;
    net_total?: number;
    gross_total?: number;
    vat_total?: number;
    document_total?: number;
    delivery_date?: string | null;
    updated_at?: string | null;
    cart_name?: string | null;
  }>;
  count: number;
  page: number;
  limit: number;
}

const toSavedCart = (entry: SavedCartListResponse['data'][number]): SavedCartSummary => ({
  cartId: entry.cart_id,
  label: entry.cart_name?.trim() || `Cart #${entry.cart_id}`,
  status: entry.status,
  netTotal: Number(entry.net_total ?? 0),
  grossTotal: Number(entry.gross_total ?? 0),
  vatTotal: Number(entry.vat_total ?? 0),
  documentTotal: Number(entry.document_total ?? 0),
  deliveryDate: entry.delivery_date ?? null,
  updatedAt: entry.updated_at ?? null,
});

const ensureCustomerContext = () => {
  const { customer_code, address_code } = ERP_STATIC;
  if (!customer_code || !address_code) {
    throw new Error('Missing ERP_STATIC customer or address code');
  }
};

export async function listSavedCarts(options?: {
  page?: number;
  limit?: number;
  status?: string | string[];
}) {
  ensureCustomerContext();

  const payload = {
    page: options?.page ?? 1,
    limit: options?.limit ?? 50,
    filters: {
      customer_code: ERP_STATIC.customer_code,
      address_code: ERP_STATIC.address_code,
      username: ERP_STATIC.username,
      ...(options?.status ? { status: options.status } : {}),
    },
  };

  const raw = await post<SavedCartListResponse>(API_ENDPOINTS_B2B.CART_SAVED_LIST, payload);
  const carts = (raw?.data ?? []).map(toSavedCart);

  // API may update server-side active cart id; keep ERP_STATIC in sync when we detect active
  const active = carts.find((c) => c.status === 'A');
  if (active) {
    setErpStatic({ id_cart: String(active.cartId) });
  }

  return {
    carts,
    total: raw?.count ?? carts.length,
    page: raw?.page ?? payload.page,
    limit: raw?.limit ?? payload.limit,
  };
}

export async function saveCart(options: {
  cartId: number | string;
  label: string;
}) {
  ensureCustomerContext();

  const payload = {
    label: options.label,
    cart_id: Number(options.cartId),
    customer_code: ERP_STATIC.customer_code,
    address_code: ERP_STATIC.address_code,
  };

  const raw = await post(API_ENDPOINTS_B2B.CART_SAVE, payload);
  return toSavedCart(raw as SavedCartListResponse['data'][number]);
}

export async function activateCart(options: { cartId: number | string }) {
  ensureCustomerContext();

  const payload = {
    cart_id: Number(options.cartId),
    customer_code: ERP_STATIC.customer_code,
    address_code: ERP_STATIC.address_code,
  };

  const raw = await post(API_ENDPOINTS_B2B.CART_ACTIVATE, payload);
  const summary = toSavedCart(raw as SavedCartListResponse['data'][number]);

  setErpStatic({ id_cart: String(summary.cartId) });

  return summary;
}

export async function deactivateCart(options: { cartId: number | string; label?: string }) {
  ensureCustomerContext();

  const payload = {
    label: options.label ?? `Cart #${options.cartId}`,
    cart_id: Number(options.cartId),
    customer_code: ERP_STATIC.customer_code,
    address_code: ERP_STATIC.address_code,
  };

  const raw = await post(API_ENDPOINTS_B2B.CART_SAVE, payload);
  return toSavedCart(raw as SavedCartListResponse['data'][number]);
}
