import { useQuery } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC } from '@framework/utils/static';

import { transformPaymentDeadline } from '@utils/transform/b2b-payment-deadline';
import { transformExposition } from '@utils/transform/b2b-exposition';

import type {
  Address,
  RawPaymentDeadlineResponse,
  PaymentDeadlineSummary,
  RawExposition,
  Exposition,
  AddressB2B,
  RawAddressesResponse,
} from './types-b2b-account';
import { transformAddresses } from '@utils/transform/b2b-addresses';

// common payload
const buildPayload = () => ({ ...ERP_STATIC });

// ===== Exposition (OBJECT) =====
export async function fetchExposition(): Promise<Exposition> {
  const res = await post<RawExposition>(API_ENDPOINTS_B2B.GET_EXPOSITION, buildPayload());
  if (!res || typeof res !== 'object') {
    throw new Error('Unexpected ERP response for exposition.');
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
  });

// ===== Payment Deadline (OBJECT -> {items:[]}) =====
export async function fetchPaymentDeadline(): Promise<PaymentDeadlineSummary> {
  const res = await post<RawPaymentDeadlineResponse>(
    API_ENDPOINTS_B2B.GET_PAYMENT_DEADLINE,
    buildPayload()
  );
  if (!res || typeof res !== 'object') {
    throw new Error('Unexpected ERP response for payment deadline.');
  }
  return transformPaymentDeadline(res);
}
export const usePaymentDeadlineQuery = (enabled = true) =>
  useQuery<PaymentDeadlineSummary, Error>({
    queryKey: [API_ENDPOINTS_B2B.GET_PAYMENT_DEADLINE],
    queryFn: fetchPaymentDeadline,
    enabled,
  });
  

export async function fetchAddresses(): Promise<AddressB2B[]> {
  const res = await post<RawAddressesResponse>(
    API_ENDPOINTS_B2B.GET_ADDRESSES,
    buildPayload()
  );
  if (!res || typeof res !== 'object' || !Array.isArray(res.ListaIndirizzi)) {
    throw new Error('Unexpected ERP response for addresses.');
  }
  return transformAddresses(res);
}

export const useAddressQuery = (enabled = true) =>
  useQuery<AddressB2B[], Error>({
    queryKey: [API_ENDPOINTS_B2B.GET_ADDRESSES],
    queryFn: fetchAddresses,
    enabled,
  });