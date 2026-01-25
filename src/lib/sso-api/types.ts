/**
 * SSO API Types
 * Matches the Commerce Suite SSO API endpoints
 */

// =============================================================================
// USER & PROFILE
// =============================================================================

export interface SSOAddress {
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

export interface SSOCustomer {
  id: string;
  erp_customer_id: string;
  name?: string;
  business_name?: string;
  addresses: SSOAddress[];
}

export interface SSOUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  supplier_id?: string;
  supplier_name?: string;
  customers: SSOCustomer[];
  has_password: boolean;
}

// =============================================================================
// AUTH RESPONSES
// =============================================================================

export interface SSOLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: SSOUser;
  tenant_id: string;
  session_id: string;
  vinc_tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface SSOValidateResponse {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
    supplier_id?: string;
    supplier_name?: string;
    customers?: SSOCustomer[];
  };
  tenant_id?: string;
  session_id?: string;
  expires_at?: string;
  // RFC 7662 fields (from POST /api/auth/validate)
  active?: boolean;
  token_type?: string;
  client_id?: string;
  username?: string;
  sub?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

export interface SSORefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface SSOLogoutResponse {
  success: boolean;
  sessions_ended?: number;
  redirect_uri?: string;
}

export interface SSOChangePasswordResponse {
  success: boolean;
  message?: string;
}

export interface SSOResetPasswordResponse {
  success: boolean;
  message?: string;
}

// =============================================================================
// B2B ADDRESSES
// =============================================================================

export interface B2BAddressResponse {
  id: string;
  title: string;
  isLegalSeat: boolean;
  isDefault: boolean;
  address: {
    street_address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  paymentTerms?: {
    code?: string;
  };
}

export interface B2BAddressesResponse {
  success: boolean;
  addresses: B2BAddressResponse[];
}

// =============================================================================
// ERROR
// =============================================================================

export interface SSOErrorResponse {
  error: string;
  lockout_until?: string;
  attempts_remaining?: number;
}
