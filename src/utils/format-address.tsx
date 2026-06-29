type AddressFields = {
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

/**
 * Accept either the inner address object ({ street_address, city, ... }) or a
 * normalized AddressB2B wrapper that nests it under `.address`.
 */
function pickAddress(input: any): AddressFields {
  if (!input || typeof input !== 'object') return {};
  if (input.address && typeof input.address === 'object') return input.address;
  return input;
}

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v != null ? String(v) : '';
}

/**
 * Build a readable single-line address: "city - street".
 * Empty fields are dropped so no stray separators remain.
 */
export function formatAddress(address: any): string {
  const a = pickAddress(address);
  return [clean(a.city), clean(a.street_address)].filter(Boolean).join(' - ');
}

// Kept as an alias for backward compatibility with existing imports.
export const formatAddressB2B = formatAddress;
