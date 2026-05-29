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
