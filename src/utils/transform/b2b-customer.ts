// @utils/transform/b2b-customer.ts
import type {
  RawCustomerResponse,
  CustomerProfile,
} from '@framework/acccount/types-b2b-account';

const clean = (v?: string | null) =>
  typeof v === 'string' ? v.trim() || undefined : undefined;

export function transformCustomer(raw: RawCustomerResponse): CustomerProfile {
  const businessName = clean(raw.RagioneSociale) ?? clean(raw.Descrizione);
  return {
    code: clean(raw.Codice) ?? '',
    internalCode: clean(raw.CodiceInterno),
    discountCode: clean(raw.CodiceScontoCliente),
    statusCode: clean(raw.CodiceStatoAnagrafico),
    statusLabel: clean(raw.DescrizioneStatoAnangrafico),
    activityCategoryCode: clean(raw.CodiceCategoriaAttivita),
    activityCategoryLabel: clean(raw.DescrizioneCategoriaAttivita),
    businessName,
    firstName: clean(raw.Nome),
    lastName: clean(raw.Cognome),
    taxCode: clean(raw.CodiceFiscale),
    vatNumber: clean(raw.PartitaIVA),
    vatCee: clean(raw.PartitaIVACee),
    pec: clean(raw.PEC),
    sdi: clean(raw.SDI),
    isLegalEntity: raw.isPersonaFisicaOGiuridica === false, // false => legal entity
  };
}
