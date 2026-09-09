import type { AddressB2B } from '@framework/acccount/types-b2b-account';

/**
 * Everything a shopper might type when hunting for one of their delivery
 * addresses: the ERP code they know it by, its label, the street line, and the
 * people attached to it.
 */
function haystack(a: AddressB2B): string {
  const addr = a.address;
  return [
    a.id,
    a.title,
    addr?.street_address,
    addr?.zip,
    addr?.city,
    addr?.state,
    // "0" is the ERP's empty country. `fmtAddress` already hides it, and
    // matching on it would make a bare "0" pull up every address that has no
    // country set.
    addr?.country && addr.country !== '0' ? addr.country : '',
    a.contact?.phone,
    a.contact?.mobile,
    a.contact?.email,
    a.agent?.code,
    a.agent?.name,
    a.agent?.email,
    a.agent?.phone,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * Narrow a delivery-address list by free text — the same case-insensitive
 * substring match the cart table uses for SKU/name/model, so the two search
 * boxes behave alike. Deliberately not a regular expression: half-typed input
 * like "via (" would throw on every keystroke.
 */
export function filterAddresses(
  addresses: AddressB2B[],
  query: string,
): AddressB2B[] {
  const q = query.trim().toLowerCase();
  if (!q) return addresses;
  return addresses.filter((a) => haystack(a).includes(q));
}
