import type {
  RawAddressesResponse,
  RawAddress,
  AddressB2B,
} from '@framework/acccount/types-b2b-account';
import type { CustomerAddressAgent } from 'vinc-erp';

function normalize(r: RawAddress): AddressB2B {
  const title =
    r.Citta || r.Comune
      ? `${r.IndirizzoEsteso} - ${r.Citta || r.Comune}`
      : r.IndirizzoEsteso;

  return {
    id: r.Codice,
    title,
    isLegalSeat: !!r.IsSedeLegale,
    address: {
      street_address: r.IndirizzoEsteso || '',
      city: r.Citta || r.Comune || '',
      state: r.Provincia || '',
      zip: r.CAP || '',
      country: r.Nazione || '',
    },
    contact: {
      phone: r.Telefono || undefined,
      mobile: r.Cellulare || undefined,
      email: r.EMailAddress || undefined,
    },
    agent: {
      code: r.CodiceAgente || undefined,
      name: r.DescrizioneAgente || undefined,
      email: r.EMailAgente || undefined,
      phone: r.TelefonoAgente || undefined,
    },
    paymentTerms: {
      code: r.CodiceModalitaPagamento || undefined,
      label: r.DescrizioneModalitaPagamento || undefined,
    },
    port: {
      code: r.CodicePorto || undefined,
      label: r.DescrizionePorto || undefined,
    },
    carrier: {
      code: r.CodiceVettore || undefined,
      label: r.DescrizioneVettore || undefined,
    },
    currency: {
      code: r.CodiceValuta || undefined,
      label: r.DescrizioneValuta || undefined,
    },
  };
}

export function transformAddresses(res: RawAddressesResponse): AddressB2B[] {
  const list = Array.isArray(res?.ListaIndirizzi) ? res.ListaIndirizzi : [];
  return list.map(normalize);
}

/**
 * The single agent the storefront shows as "AGENTE DI RIFERIMENTO".
 *
 * MyMB attaches an agent to each ADDRESS and agents can differ per address, so
 * the choice follows the same customer+address pair that already drives
 * pricing and promos:
 *
 *   1. the address the customer is operating under (`activeAddressCode`,
 *      i.e. ERP_STATIC.address_code from the login selection);
 *   2. the legal seat (MyMB's IsSedeLegale, see attachAgents);
 *   3. the first address that actually has an agent.
 *
 * An address whose agent object exists but is entirely blank does NOT count —
 * returning it would render an empty section instead of hiding it. The '0'
 * sentinel ERP_STATIC uses for "no address selected" is treated as absent.
 */
export function selectReferenceAgent(
  addresses: AddressB2B[],
  activeAddressCode?: string,
): AddressB2B['agent'] | undefined {
  const hasAny = (a: AddressB2B) =>
    Boolean(
      a.agent && Object.values(a.agent).some((v) => String(v ?? '').trim()),
    );
  const list = Array.isArray(addresses) ? addresses : [];
  const active = String(activeAddressCode ?? '').trim();
  const byActive =
    active && active !== '0'
      ? list.find((a) => String(a.id) === active && hasAny(a))
      : undefined;
  return (
    byActive ??
    list.find((a) => a.isLegalSeat && hasAny(a)) ??
    list.find(hasAny)
  )?.agent;
}

/** Blank ERP strings become undefined so the UI can test truthiness. */
const orUndefined = (v?: string) => (v && v.trim() ? v.trim() : undefined);

/**
 * Merge the per-address agents from MyMB onto addresses sourced from the
 * Commerce Suite, matching on the address code.
 *
 * `agents === null` means the ERP could not answer (no MyMB for this tenant,
 * a ReturnCode !== 0, a timeout) — the addresses are returned untouched so the
 * account page simply omits the agent block instead of rendering a blank one.
 */
export function attachAgents(
  addresses: AddressB2B[],
  agents: CustomerAddressAgent[] | null,
): AddressB2B[] {
  if (!agents || agents.length === 0) return addresses;
  const byCode = new Map(agents.map((a) => [String(a.addressCode), a]));

  // MyMB is the ERP of record for this tenant, so it is the authority on which
  // address is the sede legale — the Suite derives isLegalSeat from
  // address_type === 'billing' and on some tenants marks nothing at all
  // (Belli e Forti: all 11 addresses false). Agents CAN differ per address, so
  // the "prefer the legal seat" rule in selectReferenceAgent must key off the
  // ERP's flag, not the Suite's. An address MyMB does not know keeps its own.
  return addresses.map((addr) => {
    const a = byCode.get(String(addr.id));
    if (!a) return addr;
    return {
      ...addr,
      isLegalSeat: a.isLegalSeat,
      agent: {
        code: orUndefined(a.code),
        name: orUndefined(a.name),
        email: orUndefined(a.email),
        phone: orUndefined(a.phone),
      },
    };
  });
}
