import type { RawAddressesResponse, RawAddress, AddressB2B } from '@framework/acccount/types-b2b-account';

function normalize(r: RawAddress): AddressB2B {
  const title = r.Citta || r.Comune
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
