import type { OrderSummary } from '@framework/order/types-b2b-orders-list';
import type {
  TransformedOrder,
  TransformedOrderItem,
} from '@utils/transform/b2b-order';

export interface VincOrderItem {
  line_number?: number;
  sku?: string;
  entity_code?: string;
  name?: string;
  quantity?: number; // ordered qty
  qty_consegnata?: number; // delivered qty
  qty_saldata?: number;
  qty_residua?: number;
  qty_evadibile?: number;
  uom?: string;
  unit_price?: number;
  discounts_json?: string;
  vat_rate?: number;
  line_total?: number; // ordered value
  val_consegnato?: number; // delivered value
  val_saldato?: number;
  val_residuo?: number;
  val_evadibile?: number;
}

export interface VincOrderData {
  document_number?: string;
  document_date?: string;
  delivery_date?: string | null;
  status?: string;
  status_label?: string;
  total?: number;
  currency?: string;
  subtotal?: number;
  vat_total?: number;
  shipping_cost?: number;
  discount_total?: number;
  payment_method?: string;
  agent_code?: string;
  notes?: string;
  shipping_address?: {
    code?: string;
    label?: string;
    street?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  };
  erp_meta?: Record<string, unknown>;
  items?: VincOrderItem[];
}

export interface VincOrderRecord {
  _id: string;
  relation_id?: string;
  data: VincOrderData;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Bozza',
  submitted: 'Inviato',
  to_fulfill: 'Da evadere',
  in_transit: 'In consegna',
  fulfilled: 'Evaso',
  invoiced: 'Fatturato',
  cancelled: 'Annullato',
};

export function vincStatusLabel(status?: string): string {
  if (!status) return '';
  return STATUS_LABELS[status] ?? status;
}

/** Map the existing orders filter chip (T/NE/E/IA) to a VINC status filter. */
export function typeToVincStatus(type?: string): string | undefined {
  switch (type) {
    case 'NE': // Da evadere
    case 'IA': // In accettazione (web order still to fulfil)
      return 'to_fulfill';
    case 'E': // Evaso
      return 'fulfilled';
    case 'T': // Tutti
    default:
      return undefined;
  }
}

function num(n: unknown): number {
  return Number.isFinite(n as number) ? Number(n) : 0;
}

function destinationOf(a?: VincOrderData['shipping_address']): string {
  if (!a) return '';
  if (a.label) return a.label;
  return [a.street, a.city].filter(Boolean).join(' - ');
}

function parseDiscounts(json?: string): number[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v)
      ? v.map(Number).filter((x) => Number.isFinite(x))
      : [];
  } catch {
    return [];
  }
}

/** Split "OC/10760" → { cause:'OC', doc_number:10760 }. */
function parseDocNumber(doc?: string): { cause: string; doc_number: number } {
  if (!doc) return { cause: '', doc_number: 0 };
  const [cause, rest] = doc.split('/');
  return { cause: cause ?? '', doc_number: Number(rest) || 0 };
}

export function vincOrderToSummary(rec: VincOrderRecord): OrderSummary {
  const d = rec.data ?? {};
  const { cause, doc_number } = parseDocNumber(d.document_number);
  return {
    id: rec._id,
    destination: destinationOf(d.shipping_address),
    date_label: d.document_date ?? '',
    document: d.document_number ?? '',
    delivery_label: d.delivery_date ?? '',
    ordered_total: num(d.total),
    status_code: d.status ?? '',
    status_label: d.status_label || vincStatusLabel(d.status),
    doc_number,
    cause,
    doc_year: 0,
    source: 'vinc',
    vincId: rec._id,
  };
}

function transformVincItem(row: VincOrderItem): TransformedOrderItem {
  const qty = num(row.quantity);
  const unit = num(row.unit_price);
  return {
    id: row.line_number ?? row.sku ?? '',
    name: row.name || row.sku || '',
    image: undefined,
    unit: row.uom || undefined,
    price: unit,
    quantity: qty,
    sku: row.sku ?? '',
    reviewUrl: row.entity_code ? `/prodotto/${row.entity_code}` : undefined,
    note: undefined,
    delivered_in_quantity: num(row.qty_consegnata),
    ordered_in_quantity: qty,
    delivered_in_price: num(row.val_consegnato),
    ordered_in_price: num(row.line_total),
    // enrichment
    uom: row.uom || undefined,
    vatRate: row.vat_rate,
    discounts: parseDiscounts(row.discounts_json),
    lineTotal: num(row.line_total),
    entityCode: row.entity_code,
    lineNumber: row.line_number,
  };
}

export function vincOrderDetailToTransformed(
  rec: VincOrderRecord,
): TransformedOrder {
  const d = rec.data ?? {};
  const { cause, doc_number } = parseDocNumber(d.document_number);
  const a = d.shipping_address ?? {};
  const addr = {
    label: a.label,
    street_address: a.street ?? '',
    city: a.city ?? '',
    state: a.province ?? '',
    zip: a.postal_code ?? '',
    country: a.country ?? '',
  };
  const items = (d.items ?? []).map(transformVincItem);
  return {
    id: rec._id,
    cause,
    doc_number: String(doc_number || ''),
    doc_year: '',
    tracking_number: d.document_number ?? '',
    sub_total: num(d.subtotal),
    discount: num(d.discount_total),
    delivery_fee: num(d.shipping_cost),
    tax: num(d.vat_total),
    total: num(d.total),
    created_at: d.document_date ?? '',
    shipping_address: { ...addr },
    billing_address: { ...addr },
    items,
    meta: {
      cause,
      year: '',
      delivery_date: d.delivery_date ?? '',
      registration_date: d.document_date ?? '',
    },
    // enrichment
    currency: d.currency,
    status: d.status,
    statusLabel: d.status_label || vincStatusLabel(d.status),
    subtotal: num(d.subtotal),
    vatTotal: num(d.vat_total),
    discountTotal: num(d.discount_total),
    shippingCost: num(d.shipping_cost),
    paymentMethod: d.payment_method,
    agentCode: d.agent_code,
    notes: d.notes,
    erpMeta: d.erp_meta,
  };
}
