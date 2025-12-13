/**
 * VINC API Client
 *
 * Internal service-to-service client for calling vinc-api from vinc-b2b
 *
 * Setup:
 * 1. Add to .env:
 *    VINC_API_URL=http://localhost:8000
 *    VINC_INTERNAL_API_KEY=your-secret-key
 *
 * 2. Use in code:
 *    import { vincApi } from '@/lib/vinc-api';
 *
 *    // Orders
 *    const order = await vincApi.orders.get('HIDROS-2025-1');
 *    const cart = await vincApi.orders.createCart({ session_id: 'abc' });
 *    const updated = await vincApi.orders.addItem('HIDROS-2025-1', {
 *      product_id: 'SKU123',
 *      quantity: 2,
 *    });
 *
 *    // Customers
 *    const customer = await vincApi.customers.get('customer-id', 'shop-id');
 *    const addresses = await vincApi.customers.getAddresses('customer-id', 'shop-id');
 */

export { vincApi, getVincApi, VincApiClient, VincApiError } from './client';
export type { VincApiConfig } from './client';
export type * from './types';
