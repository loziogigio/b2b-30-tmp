'use client';

import { useMutation } from '@tanstack/react-query';

export interface RegistrationRequestInputType {
  company_name: string; // Ragione sociale
  email: string;
  city: string; // Comune
  address: string; // Indirizzo
  phone: string; // Numero di telefono
  vat_number: string; // Partita IVA
  sdi_code?: string; // SDI (optional)
  pec?: string; // PEC (optional)
  notes?: string; // Note aggiuntive (optional)
}

export interface RegistrationRequestResponse {
  success: boolean;
  message?: string;
}

async function submitRegistrationRequest(
  input: RegistrationRequestInputType,
): Promise<RegistrationRequestResponse> {
  const response = await fetch('/api/auth/registration-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to submit registration request');
  }

  return data;
}

export const useRegistrationRequestMutation = () => {
  return useMutation({
    mutationFn: (input: RegistrationRequestInputType) =>
      submitRegistrationRequest(input),
    onSuccess: (data) => {
      console.log('Registration request submitted successfully', data);
    },
    onError: (error) => {
      console.error('Registration request failed:', error);
    },
  });
};
