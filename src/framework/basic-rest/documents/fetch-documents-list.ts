// src/framework/documents/fetch-documents-list.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { erpApiPath } from '@framework/utils/erp-api-base';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { useThemeId } from '@/contexts/tenant.context';
import {
  RawDocumentItem,
  DocumentRow,
  DocumentsListParams,
} from '@framework/documents/types-b2b-documents';
import { transformDocumentsList } from '@utils/transform/b2b-documents-list';
import { ERP_STATIC } from '@framework/utils/static';
import { sourcePolicy } from '@framework/profile/source-policy';
import { fetchProfileRecords } from '@framework/profile/vinc-profile-client';
import {
  ddmmyyyyToIso,
  pickDirectUrl,
  vincDeliveryNoteToRow,
  vincInvoiceToRow,
  type VincDeliveryNoteRecord,
  type VincInvoiceRecord,
} from '@utils/transform/vinc-document';

// ---------- LISTA (invariato con switch F/DDT) ----------
function toErpPayload(p: DocumentsListParams) {
  return {
    date_from: p.date_from,
    date_to: p.date_to,
    ...ERP_STATIC,
  };
}

function pickListEndpoint(type?: DocumentsListParams['type']) {
  return type === 'DDT'
    ? API_ENDPOINTS_B2B.GET_DDT
    : API_ENDPOINTS_B2B.GET_INVOICES;
}

// time theme → in-app direct-ERP route, mirroring prices/orders.
function pickErpEndpoint(type?: DocumentsListParams['type']) {
  return type === 'DDT' ? '/erp/get_ddt' : '/erp/get_invoices';
}

export async function fetchDocumentsList(
  params: DocumentsListParams,
  theme?: string,
): Promise<DocumentRow[]> {
  // default theme → VINC data-model (empty state if unavailable; no proxy fallback)
  if (sourcePolicy(theme).account === 'vinc') {
    const model = params.type === 'DDT' ? 'delivery_note' : 'invoice';
    const result = await fetchProfileRecords(model, {
      relation_id: params.customer_code,
      date_from: ddmmyyyyToIso(params.date_from),
      date_to: ddmmyyyyToIso(params.date_to),
      limit: 50,
    });
    if (!result.available) return [];
    return params.type === 'DDT'
      ? (result.items as VincDeliveryNoteRecord[]).map(vincDeliveryNoteToRow)
      : (result.items as VincInvoiceRecord[]).map(vincInvoiceToRow);
  }

  const payload = toErpPayload(params);

  let raw: { message?: RawDocumentItem[] } | RawDocumentItem[];
  if (theme === 'time') {
    const httpRes = await fetch(
      erpApiPath('time', pickErpEndpoint(params.type)),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (!httpRes.ok) {
      throw new Error(`ERP documents request failed: HTTP ${httpRes.status}`);
    }
    const json = await httpRes.json();
    // Route shape: { status: 'success', data: RawDocumentItem[] }
    raw = json?.data ?? json;
  } else {
    raw = await post<{ message?: RawDocumentItem[] } | RawDocumentItem[]>(
      pickListEndpoint(params.type),
      payload,
    );
  }

  // Handle both wrapped (message: [...]) and direct ([...]) response formats
  const res: RawDocumentItem[] | undefined = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as any)?.message)
      ? (raw as any).message
      : undefined;

  if (!Array.isArray(res))
    throw new Error('Unexpected ERP response for documents list.');
  return transformDocumentsList(res);
}

export const useDocumentsListQuery = (
  params: DocumentsListParams,
  enabled = true,
) => {
  const theme = useThemeId();
  return useQuery<DocumentRow[], Error>({
    queryKey: [
      pickListEndpoint(params.type),
      theme,
      params.type,
      params.date_from,
      params.date_to,
    ],
    queryFn: () => fetchDocumentsList(params, theme),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes - don't refetch if data is fresh
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache
    refetchOnWindowFocus: false, // don't refetch when user returns to tab
  });
};

// ---------- AZIONI SUI DOCUMENTI (PDF / BARCODE / CSV) ----------
export type DocumentActionKind = 'pdf' | 'barcode' | 'csv';

/** Mappa azione -> endpoint */
function pickActionEndpoint(kind: DocumentActionKind) {
  switch (kind) {
    case 'pdf':
      return API_ENDPOINTS_B2B.GET_INVOICE_PDF;
    case 'barcode':
      return API_ENDPOINTS_B2B.GET_BARCODE_PDF;
    case 'csv':
      return API_ENDPOINTS_B2B.GET_INVOICE_CSV;
    default:
      return API_ENDPOINTS_B2B.GET_INVOICE_PDF;
  }
}

/** Payload standard per i 3 servizi */
function toActionPayload(r: DocumentRow) {
  return {
    scope: r.scope, // es. "F"
    year: r.year, // es. 2025
    number: r.number_raw, // es. 90540
    type: r.type_bar_code, // es. "I" ( = type_bar_code )
    ext_call: true,
    // ...ERP_STATIC
  };
}

/** Restituisce l'URL del documento per l'azione richiesta */
export async function fetchDocumentUrl(
  kind: DocumentActionKind,
  row: DocumentRow,
): Promise<string> {
  const payload = toActionPayload(row);
  const endpoint = pickActionEndpoint(kind);
  const res = await post<{ success: boolean; message?: string }>(
    endpoint,
    payload,
  );
  if (!res?.success || !res?.message) {
    throw new Error('Documento non disponibile.');
  }
  return res.message; // URL assoluto
}

/** Esegue la chiamata e apre in una nuova tab */
export async function openDocument(
  kind: DocumentActionKind,
  row: DocumentRow,
): Promise<void> {
  // Guardrail: DDT → only barcode
  if (row.doc_type === 'DDT' && kind !== 'barcode') {
    throw new Error('Per i DDT è disponibile solo il PDF con codice a barre.');
  }

  // VINC rows carry the document URL directly; otherwise use the ERP wrapper.
  const direct = pickDirectUrl(kind, row);
  const url = direct || (await fetchDocumentUrl(kind, row));

  if (typeof window !== 'undefined' && url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/** Hook di comodo per aprire un documento (gestisce loading/error via React Query) */
export function useOpenDocumentAction() {
  return useMutation({
    mutationKey: ['open-document'],
    mutationFn: async (vars: {
      kind: DocumentActionKind;
      row: DocumentRow;
    }) => {
      await openDocument(vars.kind, vars.row);
    },
  });
}
