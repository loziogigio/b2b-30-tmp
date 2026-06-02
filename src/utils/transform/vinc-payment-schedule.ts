import type {
  PaymentDeadlineSummary,
  PaymentDeadlineRow,
} from '@framework/acccount/types-b2b-account';

export interface VincScadenzaRecord {
  _id: string;
  data: {
    scadenza_id?: string;
    data_scadenza?: string;
    tipo_code?: string;
    tipo_label?: string;
    importo?: number;
    residuo?: number;
    valuta?: string;
    documento?: {
      causale?: string;
      anno?: number;
      numero?: number;
      numero_documento?: string;
      data_documento?: string;
    };
  };
}

function n(x: unknown): number {
  return Number.isFinite(x as number) ? Number(x) : 0;
}

/**
 * Map a flat list of VINC payment_schedule (scadenze) records to the existing
 * PaymentDeadlineSummary. Each scadenza becomes a header row (isDueView) +
 * a detail row (isReferenceView), matching how deadlines.client.tsx renders.
 * `todayISO` is YYYY-MM-DD; injected so the transform stays pure/testable.
 */
export function vincPaymentScheduleToSummary(
  records: VincScadenzaRecord[],
  todayISO: string,
): PaymentDeadlineSummary {
  const items: PaymentDeadlineRow[] = [];
  let totalGeneral = 0;
  let totalExpired = 0;
  let totalToExpire = 0;
  let currencyCode = '';

  for (const rec of records) {
    const d = rec.data ?? {};
    const importo = n(d.importo);
    const residuo = n(d.residuo);
    const due = d.data_scadenza ?? '';
    const isPast = due.slice(0, 10) < todayISO;

    if (!currencyCode && d.valuta) currencyCode = d.valuta;

    totalGeneral += importo;
    if (isPast && residuo > 0) totalExpired += importo;
    if (!isPast) totalToExpire += importo;

    items.push({
      isDueView: true,
      isReferenceView: false,
      description: d.tipo_label ?? '',
      type: d.tipo_code,
      dueDate: due || undefined,
      total: importo,
      amount: 0,
    });
    items.push({
      isReferenceView: true,
      isDueView: false,
      description: '',
      document: d.documento?.numero_documento ?? undefined,
      referenceDate: d.documento?.data_documento ?? undefined,
      amount: residuo,
      total: 0,
    });
  }

  return {
    currencyCode,
    currencyLabel: currencyCode,
    items,
    totalGeneral,
    totalExpired,
    totalToExpire,
  };
}
