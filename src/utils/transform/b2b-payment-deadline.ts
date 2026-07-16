import type {
  RawPaymentDeadlineResponse,
  RawPaymentDeadlineItem,
  PaymentDeadlineRow,
  PaymentDeadlineSummary,
} from '@framework/acccount/types-b2b-account';

function dmyToISO(dmy?: string | null): string | undefined {
  if (!dmy) return undefined;
  const [d, m, y] = dmy.split('/');
  if (!d || !m || !y) return undefined;
  // Handle placeholder date 01/01/0001
  if (y === '0001') return undefined;
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
  raw: RawPaymentDeadlineResponse,
): PaymentDeadlineSummary {
  const items = Array.isArray(raw?.ListaScadenzaConInfo)
    ? raw.ListaScadenzaConInfo.filter((x) => x?.isRiga) // keep only "rows", skip separators
        .map(normalizeItem)
    : [];

  // Calculate totals
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalGeneral = 0;
  let totalExpired = 0;
  let totalToExpire = 0;

  // Only sum from header rows (isDueView = true). Credit notes carry a
  // negative total and must still count, both in the general total and in the
  // expired/to-expire split.
  items.forEach((item) => {
    if (!item.isDueView || !item.total) return;

    totalGeneral += item.total;

    const dueDate = item.dueDate ? new Date(item.dueDate) : undefined;
    if (dueDate && dueDate < today) {
      totalExpired += item.total;
    } else {
      totalToExpire += item.total;
    }
  });

  return {
    currencyCode: raw?.CodiceValuta ?? '',
    currencyLabel: raw?.DescrizioneValuta ?? '',
    items,
    totalGeneral,
    totalExpired,
    totalToExpire,
  };
}
