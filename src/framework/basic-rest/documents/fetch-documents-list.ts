// src/framework/documents/fetch-documents-list.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import {
  RawDocumentItem,
  DocumentRow,
  DocumentsListParams,
} from '@framework/documents/types-b2b-documents';
import { transformDocumentsList } from '@utils/transform/b2b-documents-list';
import { ERP_STATIC } from '@framework/utils/static';

// ---------- LISTA (invariato con switch F/DDT) ----------
function toErpPayload(p: DocumentsListParams) {
  return {
    date_from: p.date_from,
    date_to: p.date_to,
    ...ERP_STATIC
  };
}

function pickListEndpoint(type?: DocumentsListParams['type']) {
  return type === 'DDT'
    ? API_ENDPOINTS_B2B.GET_DDT
    : API_ENDPOINTS_B2B.GET_INVOICES;
}

export async function fetchDocumentsList(params: DocumentsListParams): Promise<DocumentRow[]> {
  const payload = toErpPayload(params);
  const endpoint = pickListEndpoint(params.type);
  const res = await post<RawDocumentItem[]>(endpoint, payload);
  if (!Array.isArray(res)) throw new Error('Unexpected ERP response for documents list.');
  return transformDocumentsList(res);
}

export const useDocumentsListQuery = (params: DocumentsListParams, enabled = true) =>
  useQuery<DocumentRow[], Error>({
    queryKey: [pickListEndpoint(params.type), params],
    queryFn: () => fetchDocumentsList(params),
    enabled,
  });

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
    scope: r.scope,            // es. "F"
    year: r.year,              // es. 2025
    number: r.number_raw,      // es. 90540
    type: r.type_bar_code,     // es. "I" ( = type_bar_code )
    ext_call:true
    // ...ERP_STATIC
  };
}

/** Restituisce l'URL del documento per l'azione richiesta */
export async function fetchDocumentUrl(
  kind: DocumentActionKind,
  row: DocumentRow
): Promise<string> {
  const payload = toActionPayload(row);
  const endpoint = pickActionEndpoint(kind);
  const res = await post<{ success: boolean; message?: string }>(endpoint, payload);
  if (!res?.success || !res?.message) {
    throw new Error('Documento non disponibile.');
  }
  return res.message; // URL assoluto
}

/** Esegue la chiamata e apre in una nuova tab */
export async function openDocument(kind: DocumentActionKind, row: DocumentRow): Promise<void> {
    // Guardrail: DDT → solo barcode
    if (row.doc_type === 'DDT' && kind !== 'barcode') {
      throw new Error('Per i DDT è disponibile solo il PDF con codice a barre.');
    }
  
    const url = await fetchDocumentUrl(kind, row);
  
    if (typeof window !== 'undefined' && url) {
      // 👇 apre sempre in una nuova tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
  

/** Hook di comodo per aprire un documento (gestisce loading/error via React Query) */
export function useOpenDocumentAction() {
  return useMutation({
    mutationKey: ['open-document'],
    mutationFn: async (vars: { kind: DocumentActionKind; row: DocumentRow }) => {
      await openDocument(vars.kind, vars.row);
    },
  });
}
