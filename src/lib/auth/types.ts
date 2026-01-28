/**
 * Shared Types for Authentication
 *
 * Common type definitions used across auth utilities.
 */

/**
 * User profile as returned by SSO.
 * This is the canonical profile structure used throughout the app.
 */
export interface SSOUserProfile {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  supplier_id?: string;
  supplier_name?: string;
  has_password?: boolean;
  customers: SSOCustomer[];
}

/**
 * Customer data from SSO profile.
 */
export interface SSOCustomer {
  id: string;
  erp_customer_id: string;
  name?: string;
  business_name?: string;
  addresses: SSOAddress[];
}

/**
 * Address data from SSO profile.
 */
export interface SSOAddress {
  id: string;
  erp_address_id: string;
  label?: string;
  pricelist_code?: string;
}

/**
 * Auth tokens returned by login/refresh.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  sessionId?: string;
}

/**
 * Login response from /api/auth/login.
 */
export interface LoginResponse {
  success: boolean;
  token: string;
  refresh_token: string;
  expires_in: number;
  session_id: string;
  profile: SSOUserProfile;
  message?: string;
}

/**
 * Refresh response from /api/auth/refresh.
 */
export interface RefreshResponse {
  success: boolean;
  token?: string;
  refresh_token?: string;
  expires_in?: number;
  message?: string;
}

/**
 * Validate response from /api/auth/validate.
 */
export interface ValidateResponse {
  success: boolean;
  authenticated: boolean;
  profile?: SSOUserProfile;
  message?: string;
}
