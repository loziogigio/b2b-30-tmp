import { useQuery } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC } from '@framework/utils/static';

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

// common payload
const buildPayload = () => ({ ...ERP_STATIC });

// ===== Exposition (OBJECT) =====
export async function fetchExposition(): Promise<Exposition> {
  const raw = await post<{ message?: RawExposition } | RawExposition>(
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
export const useExpositionQuery = (enabled = true) =>
  useQuery<Exposition, Error>({
    queryKey: [API_ENDPOINTS_B2B.GET_EXPOSITION],
    queryFn: fetchExposition,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });

// ===== Payment Deadline (OBJECT -> {items:[]}) =====
export async function fetchPaymentDeadline(): Promise<PaymentDeadlineSummary> {
  const raw = await post<
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
export const usePaymentDeadlineQuery = (enabled = true) =>
  useQuery<PaymentDeadlineSummary, Error>({
    queryKey: [API_ENDPOINTS_B2B.GET_PAYMENT_DEADLINE],
    queryFn: fetchPaymentDeadline,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes - don't refetch if data is fresh
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache
    refetchOnWindowFocus: false, // don't refetch when user returns to tab
  });

export async function fetchAddresses(): Promise<AddressB2B[]> {
  const vincCustomerId = ERP_STATIC.vinc_customer_id;

  if (!vincCustomerId) {
    return [];
  }

  const response = await fetch('/api/b2b/addresses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_ID!,
      'X-API-Secret': process.env.NEXT_PUBLIC_API_SECRET!,
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
export async function fetchCustomer(): Promise<CustomerProfile> {
  const raw = await post<
    { message?: RawCustomerResponse } | RawCustomerResponse
  >(API_ENDPOINTS_B2B.GET_CUSTOMER, buildPayload());
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

export const useCustomerQuery = (enabled = true) =>
  useQuery<CustomerProfile, Error>({
    queryKey: [API_ENDPOINTS_B2B.GET_CUSTOMER],
    queryFn: fetchCustomer,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });
