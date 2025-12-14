/**
 * VINC API Types
 * Matches the Python schemas in vinc-api
 */

// Order Status
export type OrderStatus =
  | 'draft'
  | 'quote_sent'
  | 'quote_accepted'
  | 'confirmed'
  | 'order'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type CustomerType = 'B2B' | 'B2C';

// Order Item
export interface OrderItem {
  item_id: string;
  line_number: number;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  pricing: {
    list_price: number;
    sale_price: number;
    currency: string;
  };
  totals: {
    subtotal: number;
    tax_amount: number;
    total: number;
  };
}

// Order Totals
export interface OrderTotals {
  items_list_total: number;
  items_subtotal: number;
  items_tax: number;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  currency: string;
}

// Order Customer
export interface OrderCustomer {
  customer_id?: string;
  customer_type: CustomerType;
  erp_code?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  vat_number?: string;
  tier?: string;
}

// Cart/Order Response
export interface CartResponse {
  order_id: string;
  tenant_id: string;
  status: OrderStatus;
  customer?: OrderCustomer;
  items: OrderItem[];
  totals: OrderTotals;
  created_at: string;
  updated_at: string;
}

// Cart Create Request
export interface CartCreateRequest {
  session_id?: string;
  customer_id?: string;
  customer_type?: CustomerType;
  shop_id?: string;
  shop_owner_type?: 'wholesaler' | 'reseller';
  reseller_id?: string;
}

// Cart Item Add Request
export interface CartItemAddRequest {
  product_id: string;
  quantity: number;
  sku?: string;
  product_name?: string;
}

// Customer Address
export interface CustomerAddress {
  id: string;
  label?: string;
  first_name: string;
  last_name: string;
  company?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default_billing: boolean;
  is_default_shipping: boolean;
}

// Customer Response
export interface CustomerResponse {
  id: string;
  shop_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company_name?: string;
  vat_number?: string;
  fiscal_code?: string;
  pec_email?: string;
  sdi_code?: string;
  addresses: CustomerAddress[];
  default_billing_address_id?: string;
  default_shipping_address_id?: string;
  created_at: string;
  updated_at: string;
}

// Address Request
export interface CustomerAddressRequest {
  label?: string;
  first_name: string;
  last_name: string;
  company?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default_billing?: boolean;
  is_default_shipping?: boolean;
}

// API Error
export interface ApiError {
  detail: string;
  status: number;
}

// =============================================================================
// B2B CUSTOMER (PostgreSQL)
// =============================================================================

export interface B2BCustomer {
  id: string;
  supplier_id: string;
  erp_customer_id: string;
  name?: string;
  is_active: boolean;
  contact_email?: string;
  contact_phone?: string;
  customer_code?: string;
  public_customer_code?: string;
  business_name?: string;
  first_name?: string;
  last_name?: string;
  fiscal_code?: string;
  vat_number?: string;
  credit_limit?: number;
  customer_category?: string;
  customer_group?: string;
  addresses?: B2BAddress[];
}

export interface B2BAddress {
  id: string;
  customer_id: string;
  erp_customer_id: string;
  erp_address_id: string;
  label?: string;
  street?: string;
  city?: string;
  zip?: string;
  province?: string;
  country?: string;
  phone?: string;
  email?: string;
  pricelist_code?: string;
  channel_code?: string;
  payment_terms_code?: string;
  is_billing_address?: boolean;
  is_shipping_address?: boolean;
  is_default?: boolean;
  is_active: boolean;
}

// =============================================================================
// AUTH
// =============================================================================

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthProfileAddress {
  id: string;
  erp_address_id: string;
  label?: string;
  pricelist_code?: string;
  street?: string;
  city?: string;
  zip?: string;
  province?: string;
  country?: string;
}

export interface AuthProfileCustomer {
  id: string;
  erp_customer_id: string;
  name?: string;
  business_name?: string;
  addresses: AuthProfileAddress[];
}

export interface AuthProfileResponse {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  supplier_id?: string;
  supplier_name?: string;
  customers: AuthProfileCustomer[];
  has_password: boolean;
}
