/**
 * VINC API Internal Client
 *
 * For service-to-service calls from vinc-b2b to vinc-api
 * Uses X-Internal-API-Key header for authentication (no JWT required)
 *
 * Usage:
 *   import { vincApi } from '@/lib/vinc-api';
 *
 *   // Get order
 *   const order = await vincApi.orders.get('HIDROS-2025-1');
 *
 *   // Create cart
 *   const cart = await vincApi.orders.createCart({ session_id: 'abc123' });
 *
 *   // Get customer addresses
 *   const addresses = await vincApi.customers.getAddresses('customer-id', 'shop-id');
 */

import type {
  CartResponse,
  CartCreateRequest,
  CartItemAddRequest,
  CustomerResponse,
  CustomerAddress,
  CustomerAddressRequest,
  ApiError,
  B2BCustomer,
  B2BAddress,
  AuthLoginRequest,
  AuthLoginResponse,
  AuthProfileResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  SetPasswordByEmailRequest,
} from './types';

class VincApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = 'VincApiError';
  }
}

interface VincApiConfig {
  baseUrl: string;
  apiKey: string;
  tenantId: string;
  serviceName?: string;
}

class VincApiClient {
  private config: VincApiConfig;

  constructor(config: VincApiConfig) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.config.baseUrl}/api/v1/internal${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Internal-API-Key': this.config.apiKey,
      'X-Tenant-ID': this.config.tenantId,
      ...(this.config.serviceName && {
        'X-Service-Name': this.config.serviceName,
      }),
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const error = await response.json();
        detail = error.detail || detail;
      } catch {
        // ignore parse error
      }
      throw new VincApiError(response.status, detail);
    }

    return response.json();
  }

  // ==========================================================================
  // ORDERS / CART
  // ==========================================================================

  orders = {
    /**
     * Get order by ID
     */
    get: (orderId: string): Promise<CartResponse> =>
      this.request(`/orders/${orderId}`),

    /**
     * Create a new cart (draft order)
     */
    createCart: (data: CartCreateRequest): Promise<CartResponse> =>
      this.request('/orders/cart', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    /**
     * Add item to cart
     */
    addItem: (
      orderId: string,
      item: CartItemAddRequest,
    ): Promise<CartResponse> =>
      this.request(`/orders/${orderId}/items`, {
        method: 'POST',
        body: JSON.stringify(item),
      }),

    /**
     * Remove item from cart
     */
    removeItem: (orderId: string, itemId: string): Promise<CartResponse> =>
      this.request(`/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE',
      }),
  };

  // ==========================================================================
  // CUSTOMERS
  // ==========================================================================

  customers = {
    /**
     * Get customer by ID
     */
    get: (customerId: string, shopId: string): Promise<CustomerResponse> =>
      this.request(`/customers/${customerId}?shop_id=${shopId}`),

    /**
     * Get customer addresses
     */
    getAddresses: (
      customerId: string,
      shopId: string,
    ): Promise<{
      addresses: CustomerAddress[];
      default_billing_address_id?: string;
      default_shipping_address_id?: string;
    }> => this.request(`/customers/${customerId}/addresses?shop_id=${shopId}`),

    /**
     * Add address to customer
     */
    addAddress: (
      customerId: string,
      shopId: string,
      address: CustomerAddressRequest,
    ): Promise<CustomerAddress> =>
      this.request(`/customers/${customerId}/addresses?shop_id=${shopId}`, {
        method: 'POST',
        body: JSON.stringify(address),
      }),

    /**
     * Update customer address
     */
    updateAddress: (
      customerId: string,
      shopId: string,
      addressId: string,
      address: CustomerAddressRequest,
    ): Promise<CustomerAddress> =>
      this.request(
        `/customers/${customerId}/addresses/${addressId}?shop_id=${shopId}`,
        {
          method: 'PUT',
          body: JSON.stringify(address),
        },
      ),

    /**
     * Delete customer address
     */
    deleteAddress: (
      customerId: string,
      shopId: string,
      addressId: string,
    ): Promise<{ success: boolean }> =>
      this.request(
        `/customers/${customerId}/addresses/${addressId}?shop_id=${shopId}`,
        {
          method: 'DELETE',
        },
      ),
  };

  // ==========================================================================
  // B2B CUSTOMERS (PostgreSQL)
  // ==========================================================================

  b2b = {
    /**
     * Get B2B customer by ID (from PostgreSQL)
     */
    getCustomer: (customerId: string): Promise<B2BCustomer> =>
      this.request(`/b2b/customers/${customerId}`),

    /**
     * Get B2B customer addresses (from PostgreSQL)
     */
    getAddresses: (customerId: string): Promise<B2BAddress[]> =>
      this.request(`/b2b/customers/${customerId}/addresses`),

    /**
     * Get specific B2B address
     */
    getAddress: (customerId: string, addressId: string): Promise<B2BAddress> =>
      this.request(`/b2b/customers/${customerId}/addresses/${addressId}`),

    /**
     * Get or create active cart for B2B customer
     * Each customer has ONE active cart at a time
     */
    getOrCreateCart: (customerId: string): Promise<CartResponse> =>
      this.request(`/b2b/customers/${customerId}/cart`, {
        method: 'POST',
      }),

    /**
     * Get active cart for B2B customer (returns 404 if none)
     */
    getActiveCart: (customerId: string): Promise<CartResponse> =>
      this.request(`/b2b/customers/${customerId}/cart`),

    /**
     * Set addresses on B2B customer's active cart
     */
    setCartAddresses: (
      customerId: string,
      billingAddressId?: string,
      shippingAddressId?: string,
    ): Promise<CartResponse> => {
      const params = new URLSearchParams();
      if (billingAddressId)
        params.append('billing_address_id', billingAddressId);
      if (shippingAddressId)
        params.append('shipping_address_id', shippingAddressId);
      return this.request(
        `/b2b/customers/${customerId}/cart/addresses?${params}`,
        {
          method: 'PUT',
        },
      );
    },
  };

  // ==========================================================================
  // AUTH
  // ==========================================================================

  auth = {
    /**
     * Login with email and password
     * Returns JWT tokens
     */
    login: (credentials: AuthLoginRequest): Promise<AuthLoginResponse> =>
      this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    /**
     * Get user profile using access token
     * Note: Uses Bearer token for user identity + internal API key for service auth
     */
    getProfile: async (accessToken: string): Promise<AuthProfileResponse> => {
      const url = `${this.config.baseUrl}/api/v1/internal/auth/me`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Internal-API-Key': this.config.apiKey,
          'X-Tenant-ID': this.config.tenantId,
        },
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const error = await response.json();
          detail = error.detail || detail;
        } catch {
          // ignore parse error
        }
        throw new VincApiError(response.status, detail);
      }

      return response.json();
    },

    /**
     * Set password for a user (internal admin operation)
     */
    setPassword: (
      userId: string,
      password: string,
    ): Promise<{ success: boolean }> =>
      this.request('/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, password }),
      }),

    /**
     * Set password for a user by email (for password reset)
     */
    setPasswordByEmail: (
      email: string,
      password: string,
    ): Promise<{ success: boolean }> =>
      this.request('/auth/set-password-by-email', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    /**
     * Change password for authenticated user
     * Note: Uses Bearer token for authentication
     */
    changePassword: async (
      accessToken: string,
      currentPassword: string,
      newPassword: string,
    ): Promise<ChangePasswordResponse> => {
      const url = `${this.config.baseUrl}/api/v1/internal/auth/change-password`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Internal-API-Key': this.config.apiKey,
          'X-Tenant-ID': this.config.tenantId,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const error = await response.json();
          // Handle FastAPI validation errors (detail is an array)
          if (Array.isArray(error.detail)) {
            detail = error.detail[0]?.msg || 'Validation error';
          } else {
            detail = error.detail || detail;
          }
        } catch {
          // ignore parse error
        }
        throw new VincApiError(response.status, detail);
      }

      return response.json();
    },

    /**
     * Refresh access token using refresh token
     * Returns new access_token and refresh_token
     */
    refreshToken: async (refreshToken: string): Promise<AuthLoginResponse> => {
      const url = `${this.config.baseUrl}/api/v1/internal/auth/refresh`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': this.config.apiKey,
          'X-Tenant-ID': this.config.tenantId,
          'X-Refresh-Token': refreshToken,
        },
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const error = await response.json();
          detail = error.detail || detail;
        } catch {
          // ignore parse error
        }
        throw new VincApiError(response.status, detail);
      }

      return response.json();
    },
  };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let _instance: VincApiClient | null = null;

/**
 * Get the VINC API client instance
 *
 * Configuration is read from environment variables:
 * - VINC_API_URL: Base URL of vinc-api (e.g., http://localhost:8000)
 * - VINC_INTERNAL_API_KEY: Shared secret for internal API calls
 * - NEXT_PUBLIC_PROJECT_CODE: Tenant ID (e.g., vinc-hidros-it)
 */
export function getVincApi(): VincApiClient {
  if (!_instance) {
    const baseUrl = process.env.VINC_API_URL;
    const apiKey = process.env.VINC_INTERNAL_API_KEY;
    const tenantId = process.env.NEXT_PUBLIC_PROJECT_CODE;

    if (!baseUrl) {
      throw new Error('VINC_API_URL environment variable is required');
    }
    if (!apiKey) {
      throw new Error('VINC_INTERNAL_API_KEY environment variable is required');
    }
    if (!tenantId) {
      throw new Error(
        'NEXT_PUBLIC_PROJECT_CODE environment variable is required',
      );
    }

    _instance = new VincApiClient({
      baseUrl,
      apiKey,
      tenantId,
      serviceName: 'vinc-b2b',
    });
  }
  return _instance;
}

/**
 * Convenience export for direct usage
 *
 * Usage:
 *   import { vincApi } from '@/lib/vinc-api';
 *   const order = await vincApi.orders.get('HIDROS-2025-1');
 *   const tokens = await vincApi.auth.login({ email, password });
 */
export const vincApi = {
  get orders() {
    return getVincApi().orders;
  },
  get customers() {
    return getVincApi().customers;
  },
  get b2b() {
    return getVincApi().b2b;
  },
  get auth() {
    return getVincApi().auth;
  },
};

export { VincApiClient, VincApiError };
export type { VincApiConfig };
