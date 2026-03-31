export const CS_CART = {
  ACTIVE: 'api/b2b/cart/active',
  SAVE: 'api/b2b/cart/save',
  ACTIVATE: 'api/b2b/cart/activate',
  SAVED: 'api/b2b/cart/saved',
  ORDER: (id: string) => `api/b2b/orders/${id}`,
  ITEMS: (id: string) => `api/b2b/orders/${id}/items`,
  SUBMIT: (id: string) => `api/b2b/orders/${id}/submit`,
  PROCESSING_STATUS: (id: string) => `api/b2b/orders/${id}/processing-status`,
  REVERT_TO_CART: (id: string) => `api/b2b/orders/${id}/revert-to-cart`,
  RESUBMIT: (id: string) => `api/b2b/orders/${id}/resubmit`,
  PROCESSING_ORDERS: 'api/b2b/orders/processing',
};
