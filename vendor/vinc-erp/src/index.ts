// Interface + error
export type { ErpClient, ErpErrorDetail } from './erp-client.js';
export { ErpError } from './erp-client.js';

// Cache
export type { CacheAdapter } from './cache.js';
export { NoopCacheAdapter } from './cache.js';

// Endpoints
export { MYMB_ENDPOINTS } from './endpoints.js';
export type { MyMbEndpoint } from './endpoints.js';

// Types
export type {
  MyMbErpSettings,
  PriceQuery,
  MyMbPriceEntry,
  ProductLabelAction,
  NormalizedPackagingOption,
} from './types/pricing.js';
export type { MyMbCartClosureInfo } from './types/cart-closure.js';
export { buildCartClosureInfo } from './types/cart-closure.js';

// MYMB implementation
export { parseMyMbConnection } from './mymb/auth.js';
export type { MyMbConnection } from './mymb/auth.js';
export { MyMbErpClient } from './mymb/mymb-erp-client.js';
export type { MyMbErpClientConfig } from './mymb/mymb-erp-client.js';
export {
  getPackagingOptions,
  getLabelAndCartStatus,
  buildPriceEntry,
} from './mymb/transform.js';

// Coupon endpoints + client
export { MYMB_COUPON_ENDPOINTS } from './endpoints.js';
export type { MyMbCouponEndpoint } from './endpoints.js';
export { CouponClient } from './mymb/coupon-client.js';
export type {
  CouponClientConfig,
  CouponValidation,
  CartCouponInfo,
  CouponPersistResult,
} from './mymb/coupon-client.js';
export { mymbRequest } from './mymb/request.js';
export type { MymbRequestOpts } from './mymb/request.js';

// ArxivarIX document-archive endpoints + client
export { ARXIVAR_ENDPOINTS } from './endpoints.js';
export type { ArxivarEndpoint } from './endpoints.js';
export { ArxivarClient } from './mymb/arxivar-client.js';
export type {
  ArxivarClientConfig,
  ArxivarInvoiceResult,
  GetInvoicePdfInput,
} from './mymb/arxivar-client.js';
