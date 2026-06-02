import { useQuery } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { erpApiPath } from '@framework/utils/erp-api-base';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC } from '@framework/utils/static';
import { useThemeId } from '@/contexts/tenant.context';

import { transformPaymentDeadline } from '@utils/transform/b2b-payment-deadline';
import { transformExposition } from '@utils/transform/b2b-exposition';

import type {
  RawPaymentDeadlineResponse,
  PaymentDeadlineSummary,
  RawExposition,
  Exposition,
  AddressB2B,
  RawAddressesResponse,
  CustomerProfile,
  RawCustomerResponse,
} from './types-b2b-account';
import { transformAddresses } from '@utils/transform/b2b-addresses';
import { transformCustomer } from '@utils/transform/b2b-customer';
import { sourcePolicy } from '@framework/profile/source-policy';
import { fetchProfileRecords } from '@framework/profile/vinc-profile-client';
import {
  vincCreditExposureToExposition,
  type VincCreditExposureRecord,
} from '@utils/transform/vinc-credit-exposure';

// common payload
const buildPayload = () => ({ ...ERP_STATIC });

// time theme → in-app direct-ERP route (/api/erp/<endpoint>), mirroring prices
// and orders. `erpEndpoint` is the legacy `/erp/<name>` form; the route returns
// { status, data: <MyMB *Result> }, which we unwrap to the bare Result so the
// existing direct-format handling below applies unchanged.
async function erpPost<T>(erpEndpoint: string, payload: unknown): Promise<T> {
  const res = await fetch(erpApiPath('time', erpEndpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`ERP request failed: HTTP ${res.status}`);
  }
  const json = await res.json();
  return (json?.data ?? json) as T;
}

// ===== Exposition (OBJECT) =====
export async function fetchExposition(theme?: string): Promise<Exposition> {
  // default theme → VINC credit_exposure latest snapshot (zeroed if unavailable;
  // no proxy fallback). Default route sort is -data.snapshot_date, so limit:1
  // returns the most recent snapshot.
  if (sourcePolicy(theme).account === 'vinc') {
    const result = await fetchProfileRecords('credit_exposure', {
      relation_id: ERP_STATIC.customer_code,
      limit: 1,
    });
    const rec = result.items?.[0] as VincCreditExposureRecord | undefined;
    if (!result.available || !rec) {
      return vincCreditExposureToExposition({ _id: '', data: {} });
    }
    return vincCreditExposureToExposition(rec);
  }

  const raw =
    theme === 'time'
      ? await erpPost<{ message?: RawExposition } | RawExposition>(
          '/erp/exposition',
          buildPayload(),
        )
      : await post<{ message?: RawExposition } | RawExposition>(
          API_ENDPOINTS_B2B.GET_EXPOSITION,
          buildPayload(),
        );
  if (!raw || typeof raw !== 'object') {
    throw new Error('Unexpected ERP response for exposition.');
  }

  // Handle both wrapped (message: {...}) and direct ({...}) response formats
  const res: RawExposition | undefined =
    (raw as any)?.message?.ReturnCode !== undefined
      ? (raw as any).message
      : (raw as RawExposition)?.ReturnCode !== undefined
        ? (raw as RawExposition)
        : undefined;

  if (!res || typeof res !== 'object') {
    throw new Error('Unexpected ERP response format for exposition.');
  }
  if (typeof res.ReturnCode === 'number' && res.ReturnCode !== 0) {
    throw new Error(res.Message || 'ERP returned an error for exposition.');
  }
  return transformExposition(res);
}
export const useExpositionQuery = (enabled = true) => {
  const theme = useThemeId();
  return useQuery<Exposition, Error>({
    queryKey: [API_ENDPOINTS_B2B.GET_EXPOSITION, theme],
    queryFn: () => fetchExposition(theme),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

// ===== Payment Deadline (OBJECT -> {items:[]}) =====
export async function fetchPaymentDeadline(
  theme?: string,
): Promise<PaymentDeadlineSummary> {
  const raw =
    theme === 'time'
      ? await erpPost<
          { message?: RawPaymentDeadlineResponse } | RawPaymentDeadlineResponse
        >('/erp/payment_deadline', buildPayload())
      : await post<
          { message?: RawPaymentDeadlineResponse } | RawPaymentDeadlineResponse
        >(API_ENDPOINTS_B2B.GET_PAYMENT_DEADLINE, buildPayload());
  if (!raw || typeof raw !== 'object') {
    throw new Error('Unexpected ERP response for payment deadline.');
  }

  // Handle both wrapped (message: {...}) and direct ({...}) response formats
  const res: RawPaymentDeadlineResponse | undefined =
    (raw as any)?.message?.CodiceValuta !== undefined
      ? (raw as any).message
      : (raw as RawPaymentDeadlineResponse)?.CodiceValuta !== undefined
        ? (raw as RawPaymentDeadlineResponse)
        : undefined;

  if (!res || typeof res !== 'object') {
    throw new Error('Unexpected ERP response format for payment deadline.');
  }
  return transformPaymentDeadline(res);
}
export const usePaymentDeadlineQuery = (enabled = true) => {
  const theme = useThemeId();
  return useQuery<PaymentDeadlineSummary, Error>({
    queryKey: [API_ENDPOINTS_B2B.GET_PAYMENT_DEADLINE],
    queryFn: () => fetchPaymentDeadline(theme),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes - don't refetch if data is fresh
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache
    refetchOnWindowFocus: false, // don't refetch when user returns to tab
  });
};

export async function fetchAddresses(): Promise<AddressB2B[]> {
  const vincCustomerId = ERP_STATIC.vinc_customer_id;

  if (!vincCustomerId) {
    return [];
  }

  // Call internal API route - credentials are handled server-side
  const response = await fetch('/api/b2b/addresses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customer_id: vincCustomerId }),
  });

  const data = await response.json();

  if (data.success && Array.isArray(data.addresses)) {
    return data.addresses;
  }

  throw new Error(data.message || 'Failed to fetch addresses from VINC API');
}

export const useAddressQuery = (enabled = true) =>
  useQuery<AddressB2B[], Error>({
    queryKey: [API_ENDPOINTS_B2B.GET_ADDRESSES],
    queryFn: fetchAddresses,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });

// ===== Customer (OBJECT) =====
export async function fetchCustomer(theme?: string): Promise<CustomerProfile> {
  // default theme → VINC Commerce-Suite customer (via BFF); no legacy proxy call.
  if (sourcePolicy(theme).account === 'vinc') {
    const vincId = ERP_STATIC.vinc_customer_id;
    if (!vincId) {
      return {
        code: ERP_STATIC.customer_code || '',
        businessName: ERP_STATIC.company_name || undefined,
        isLegalEntity: true,
      } as CustomerProfile;
    }
    const response = await fetch('/api/b2b/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: vincId }),
    });
    const data = await response.json();
    if (data?.success && data?.customer) {
      return data.customer as CustomerProfile;
    }
    throw new Error(data?.message || 'Failed to fetch customer from VINC API');
  }

  const raw =
    theme === 'time'
      ? await erpPost<{ message?: RawCustomerResponse } | RawCustomerResponse>(
          '/erp/get_customer',
          buildPayload(),
        )
      : await post<{ message?: RawCustomerResponse } | RawCustomerResponse>(
          API_ENDPOINTS_B2B.GET_CUSTOMER,
          buildPayload(),
        );
  if (!raw || typeof raw !== 'object') {
    throw new Error('Unexpected ERP response for customer.');
  }

  // Handle both wrapped (message.Codice) and direct (Codice) response formats
  const res: RawCustomerResponse | undefined = (raw as any)?.message?.Codice
    ? (raw as any).message
    : (raw as RawCustomerResponse)?.Codice
      ? (raw as RawCustomerResponse)
      : undefined;

  if (!res || typeof res !== 'object') {
    throw new Error('Unexpected ERP response format for customer.');
  }
  if (typeof res.ReturnCode === 'number' && res.ReturnCode !== 0) {
    throw new Error(res.Message || 'ERP returned an error for customer.');
  }
  return transformCustomer(res);
}

export const useCustomerQuery = (enabled = true) => {
  const theme = useThemeId();
  return useQuery<CustomerProfile, Error>({
    queryKey: [API_ENDPOINTS_B2B.GET_CUSTOMER, theme],
    queryFn: () => fetchCustomer(theme),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });
};
