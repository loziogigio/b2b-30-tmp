import type { AxiosError, AxiosInstance } from 'axios';
import { reportErpFailure, reportErpSuccess } from './erp-health';
import { ERP_STATIC } from '@framework/utils/static';

/**
 * URLs that depend on the customer's ERP profile. A 4xx/5xx on one of these
 * for a logged-in user means their account is misconfigured server-side.
 * Covers `/erp/get_multiple_prices` and `/api/b2b/cart/...`.
 */
const CUSTOMER_CONTEXT_URL = /(\/erp\/|\/b2b\/cart)/i;

export function isCustomerContextUrl(url?: string): boolean {
  if (!url) return false;
  return CUSTOMER_CONTEXT_URL.test(url);
}

export type ErpHealthVerdict = 'failure' | 'success' | 'ignore';

/**
 * Pure decision function — given a response/error's status, url, whether the
 * user is authorized, and whether this is the error branch, decide what to do.
 */
export function evaluateErpResponse(input: {
  status?: number;
  url?: string;
  authorized: boolean;
  isError: boolean;
}): ErpHealthVerdict {
  const { status, url, authorized, isError } = input;
  if (!isCustomerContextUrl(url)) return 'ignore';

  if (!isError) {
    return status != null && status >= 200 && status < 300
      ? 'success'
      : 'ignore';
  }

  // error branch
  if (!authorized) return 'ignore';
  if (status == null) return 'ignore'; // network / timeout — not a profile issue
  if (status === 401) return 'ignore'; // handled by the auth/refresh interceptor
  if (status >= 400 && status <= 599) return 'failure';
  return 'ignore';
}

function isAuthorized(): boolean {
  return !!ERP_STATIC.customer_code;
}

/**
 * Attach the ERP-health response interceptor to an axios instance.
 * Never throws on its own; always re-throws the original error.
 */
export function addErpHealthInterceptor(http: AxiosInstance): void {
  http.interceptors.response.use(
    (response) => {
      if (typeof window !== 'undefined') {
        try {
          const verdict = evaluateErpResponse({
            status: response.status,
            url: response.config?.url,
            authorized: isAuthorized(),
            isError: false,
          });
          if (verdict === 'success') reportErpSuccess();
        } catch {
          // health logic must never break a successful response
        }
      }
      return response;
    },
    (error: AxiosError) => {
      if (typeof window !== 'undefined') {
        try {
          const verdict = evaluateErpResponse({
            status: error.response?.status,
            url: error.config?.url,
            authorized: isAuthorized(),
            isError: true,
          });
          if (verdict === 'failure') reportErpFailure();
        } catch {
          // ignore — fall through to re-throw
        }
      }
      return Promise.reject(error);
    },
  );
}
