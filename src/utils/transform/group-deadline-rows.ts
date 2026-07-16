import type { PaymentDeadlineRow } from '@framework/acccount/types-b2b-account';

export type DeadlineGroup = {
  header: PaymentDeadlineRow;
  details: PaymentDeadlineRow[];
};

/**
 * The Scadenzario arrives as a flat list where a due-view row (Tipo / Data /
 * Totale) is followed by the reference-view rows (Documento / Data / Importo)
 * belonging to it. Fold it into explicit groups so views don't have to.
 * Detail rows appearing before any header are dropped.
 */
export function groupDeadlineRows(rows: PaymentDeadlineRow[]): DeadlineGroup[] {
  const groups: DeadlineGroup[] = [];

  for (const row of rows) {
    if (row.isDueView) {
      groups.push({ header: row, details: [] });
    } else if (row.isReferenceView && groups.length) {
      groups[groups.length - 1].details.push(row);
    }
  }

  return groups;
}

/** A deadline is expired when its due date is strictly before today. */
export function isDeadlineExpired(
  row: PaymentDeadlineRow,
  now: Date = new Date(),
): boolean {
  if (!row.dueDate) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return new Date(row.dueDate) < today;
}
