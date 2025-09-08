import type {
    RawPaymentDeadlineResponse,
    RawPaymentDeadlineItem,
    PaymentDeadlineRow,
    PaymentDeadlineSummary
} from "@framework/acccount/types-b2b-account";
  
  function dmyToISO(dmy?: string | null): string | undefined {
    if (!dmy) return undefined;
    const [d, m, y] = dmy.split('/');
    if (!d || !m || !y) return undefined;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  function normalizeItem(it: RawPaymentDeadlineItem): PaymentDeadlineRow {
    return {
      referenceDate: dmyToISO(it.DataRiferimento),
      dueDate: dmyToISO(it.DataScadenza),
      description: (it.Descrizione ?? '').trim() || (it.Tipo ?? '').trim() || '',
      document: it.Documento ?? undefined,
      type: it.Tipo ?? undefined,
      amount: Number(it.Importo ?? 0),
      total: Number(it.Totale ?? 0),
      isReferenceView: !!it.isTipoVisualizzazioneRiferimento,
      isDueView: !!it.isTipoVisualizzazioneScadenza,
    };
  }
  
  export function transformPaymentDeadline(
    raw: RawPaymentDeadlineResponse
  ): PaymentDeadlineSummary {
    const items = Array.isArray(raw?.ListaScadenzaConInfo)
      ? raw.ListaScadenzaConInfo
          .filter((x) => x?.isRiga) // keep only “rows”
          .map(normalizeItem)
      : [];
  
    return {
      currencyCode: raw?.CodiceValuta ?? '',
      currencyLabel: raw?.DescrizioneValuta ?? '',
      items,
    };
  }
  