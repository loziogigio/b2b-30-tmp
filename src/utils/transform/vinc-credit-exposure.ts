import type { Exposition } from '@framework/acccount/types-b2b-account';

export interface VincCreditExposureLine {
  code?: string;
  label?: string;
  scaduto?: number;
  da_scadere?: number;
  totale?: number;
}

export interface VincCreditExposureRecord {
  _id: string;
  data: {
    snapshot_date?: string;
    currency?: string;
    lines?: VincCreditExposureLine[];
    scaduto_totale?: number;
    da_scadere_totale?: number;
    totale_esposizione?: number;
    fido_assicurato?: number;
    differenza?: number;
  };
}

function n(x: unknown): number {
  return Number.isFinite(x as number) ? Number(x) : 0;
}

function byCode(
  lines: VincCreditExposureLine[],
  code: string,
): VincCreditExposureLine | undefined {
  return lines.find((l) => l.code === code);
}

/**
 * Map a VINC credit_exposure snapshot to the existing Exposition UI shape.
 * The 6 fixed line codes (rimesse, cambiaria, bolle_nf, ordini_ne, prebolle,
 * acconti) map to the Fido page's rows. trustInternalTotal / creditLimitTotal
 * are not provided by VINC and not rendered by the page → 0.
 */
export function vincCreditExposureToExposition(
  rec: VincCreditExposureRecord,
): Exposition {
  const d = rec.data ?? {};
  const lines = d.lines ?? [];
  const rim = byCode(lines, 'rimesse');
  const cam = byCode(lines, 'cambiaria');
  const bol = byCode(lines, 'bolle_nf');
  const ord = byCode(lines, 'ordini_ne');
  const pre = byCode(lines, 'prebolle');
  const acc = byCode(lines, 'acconti');

  return {
    currencyCode: d.currency ?? '',
    currencyLabel: d.currency ?? '',

    directRemittancesExpired: n(rim?.scaduto),
    directRemittancesToExpire: n(rim?.da_scadere),
    directRemittancesTotal: n(rim?.totale),

    ribaExpired: n(cam?.scaduto),
    ribaToExpire: n(cam?.da_scadere),
    ribaTotal: n(cam?.totale),

    unbilledBillsToExpire: n(bol?.da_scadere),
    unbilledBillsTotal: n(bol?.totale),

    ordersNotFulfilledToExpire: n(ord?.da_scadere),
    ordersNotFulfilledTotal: n(ord?.totale),

    prebillsToExpire: n(pre?.da_scadere),
    prebillsTotal: n(pre?.totale),

    advancesTotal: n(acc?.totale),

    trustAssuredTotal: n(d.fido_assicurato),
    trustInternalTotal: 0,
    creditLimitTotal: 0,

    total2Total: n(d.totale_esposizione),
    differenceTotal: n(d.differenza),

    message: '',
    returnCode: 0,
  };
}
