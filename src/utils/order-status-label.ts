// Resolve the status badge text for an order detail.
//
// Three vocabularies reach the detail page:
//  - MyMB StatoTestataOrdine codes (NE / E / EV / IA) via transformOrder —
//    mapped to the same i18n keys the time orders list uses;
//  - VINC historical orders, which already carry a resolved `statusLabel`;
//  - the legacy hub vocabulary (order-pending, processing, …).
type Translate = (key: string) => string;

type StatusSource = {
  status?: string;
  order_status?: string;
  statusLabel?: string;
};

const ERP_STATUS_KEYS: Record<string, string> = {
  NE: 'order-status-to-fulfill',
  E: 'order-status-fulfilled',
  EV: 'order-status-fulfilled',
  IA: 'order-status-waiting',
};

const LEGACY_STATUS_KEYS: Record<string, string> = {
  'order-pending': 'order-status-pending',
  pending: 'order-status-pending',
  'order-processing': 'order-status-processing',
  processing: 'order-status-processing',
  'order-at-local-facility': 'order-status-at-local-facility',
  'at-local-facility': 'order-status-at-local-facility',
  'order-out-for-delivery': 'order-status-out-for-delivery',
  'out-for-delivery': 'order-status-out-for-delivery',
};

export function orderStatusLabel(
  order: StatusSource | null | undefined,
  t: Translate,
): string {
  if (order?.statusLabel) return order.statusLabel;
  const raw = String(order?.order_status ?? order?.status ?? '').trim();
  const key =
    ERP_STATUS_KEYS[raw.toUpperCase()] ??
    LEGACY_STATUS_KEYS[raw] ??
    'order-status-completed';
  return t(key);
}
