import { get as pimGet, post as pimPost } from '@framework/utils/httpPIM';
import { CS_CART } from '@framework/utils/api-endpoints-cs';
import { ERP_STATIC, setErpStatic } from '@framework/utils/static';
import { ensureActiveCart } from './b2b-cart';

export type SavedCartStatus = 'A' | 'S' | string;

export interface SavedCartSummary {
  cartId: string;
  label: string;
  hasCustomLabel: boolean;
  status: SavedCartStatus;
  netTotal: number;
  grossTotal: number;
  vatTotal: number;
  documentTotal: number;
  deliveryDate?: string | null;
  updatedAt?: string | null;
  itemsCount?: number;
}

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

  const params: Record<string, any> = {
    customer_code: ERP_STATIC.customer_code,
    address_code: ERP_STATIC.address_code,
    page: options?.page ?? 1,
    limit: options?.limit ?? 50,
  };

  const raw = await pimGet<any>(CS_CART.SAVED, params);
  const savedCarts = raw?.saved_carts ?? [];

  const carts: SavedCartSummary[] = savedCarts.map((cart: any) => ({
    cartId: cart.order_id,
    label:
      cart.cart_name?.trim() || `Cart #${cart.cart_number ?? cart.order_id}`,
    hasCustomLabel: Boolean(cart.cart_name?.trim()),
    status: 'S', // saved carts are always parked
    netTotal: Number(cart.subtotal_net ?? 0),
    grossTotal: Number(cart.subtotal_gross ?? 0),
    vatTotal: 0,
    documentTotal: Number(cart.order_total ?? 0),
    deliveryDate: null,
    updatedAt: cart.updated_at ?? null,
    itemsCount: cart.item_count ?? 0,
  }));

  return {
    carts,
    total: raw?.pagination?.total ?? carts.length,
    page: raw?.pagination?.page ?? options?.page ?? 1,
    limit: raw?.pagination?.limit ?? options?.limit ?? 50,
  };
}

export async function saveCart(options: { cartId: string; label: string }) {
  ensureCustomerContext();

  const orderId = options.cartId || ERP_STATIC.vinc_order_id;
  if (!orderId) throw new Error('No active cart to save');

  await pimPost(CS_CART.SAVE, {
    order_id: orderId,
    cart_name: options.label,
  });

  // After saving (parking), create a new active cart
  await ensureActiveCart();

  return {
    cartId: orderId,
    label: options.label,
    hasCustomLabel: true,
    status: 'S' as SavedCartStatus,
    netTotal: 0,
    grossTotal: 0,
    vatTotal: 0,
    documentTotal: 0,
    deliveryDate: null,
    updatedAt: null,
  } satisfies SavedCartSummary;
}

export async function activateCart(options: { cartId: string }) {
  ensureCustomerContext();

  const raw = await pimPost<any>(CS_CART.ACTIVATE, {
    order_id: options.cartId,
    customer_code: ERP_STATIC.customer_code,
    address_code: ERP_STATIC.address_code,
  });

  const newOrderId = raw.order_id || raw.cart_id;
  setErpStatic({ vinc_order_id: newOrderId });

  return {
    cartId: newOrderId,
    label: raw.cart_name || '',
    hasCustomLabel: Boolean(raw.cart_name),
    status: 'A' as SavedCartStatus,
    netTotal: 0,
    grossTotal: 0,
    vatTotal: 0,
    documentTotal: 0,
    deliveryDate: null,
    updatedAt: null,
  } satisfies SavedCartSummary;
}

export async function deactivateCart(options: {
  cartId: string;
  label?: string;
}) {
  return saveCart({
    cartId: options.cartId,
    label: options.label || '',
  });
}
