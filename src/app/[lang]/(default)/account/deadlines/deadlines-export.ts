import type {
  PaymentDeadlineSummary,
  PaymentDeadlineRow,
} from '@framework/acccount/types-b2b-account';
import type { CustomerProfile } from '@framework/acccount/types-b2b-account';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const currency = (n?: number) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
      }).format(n)
    : '';

const dateLabel = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT');
};

export interface DeadlinesExportOptions {
  data: PaymentDeadlineSummary;
  customer?: CustomerProfile | null;
  translations: {
    title: string;
    totalGeneral: string;
    totalExpired: string;
    totalToExpire: string;
    colType: string;
    colDate: string;
    colTotal: string;
    colDocument: string;
    colAmount: string;
  };
}

export function renderDeadlinesPdfHtml(
  options: DeadlinesExportOptions,
): string {
  const { data, customer, translations: t } = options;

  const exportDate = new Date();
  const exportDateLabel = new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(exportDate);

  // Build table rows
  const rowsHtml = data.items
    .map((row, idx) => {
      if (row.isDueView) {
        // Header row
        return `
          <tr class="header-row">
            <td class="item-name">${escapeHtml(row.description)}</td>
            <td class="text-center"><span class="status-dot"></span></td>
            <td class="col-border">${escapeHtml(dateLabel(row.dueDate))}</td>
            <td class="text-right font-semibold col-border">${escapeHtml(currency(row.total))}</td>
            <td class="col-border"></td>
            <td class="col-border"></td>
            <td class="text-right col-border"></td>
          </tr>
        `;
      }
      if (row.isReferenceView) {
        // Detail row
        return `
          <tr class="detail-row">
            <td></td>
            <td></td>
            <td class="col-border"></td>
            <td class="col-border"></td>
            <td class="col-border">${escapeHtml(row.document)}</td>
            <td class="col-border">${escapeHtml(dateLabel(row.referenceDate))}</td>
            <td class="text-right col-border">${escapeHtml(currency(row.amount))}</td>
          </tr>
        `;
      }
      return '';
    })
    .join('');

  // Customer info section
  const customerHtml = customer
    ? `
      <div class="customer-info">
        <div class="company-name">${escapeHtml(customer.companyName)}</div>
        ${customer.address ? `<div>${escapeHtml(customer.address)}</div>` : ''}
        ${
          customer.zipCode || customer.city || customer.province
            ? `<div>${escapeHtml(customer.zipCode ?? '')} ${escapeHtml(customer.city ?? '')} ${customer.province ? `(${escapeHtml(customer.province)})` : ''}</div>`
            : ''
        }
        ${customer.vatNumber ? `<div>P.IVA: ${escapeHtml(customer.vatNumber)}</div>` : ''}
        ${customer.fiscalCode ? `<div>C.F.: ${escapeHtml(customer.fiscalCode)}</div>` : ''}
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(t.title)}</title>
  <style>
    :root { color-scheme: only light; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Segoe UI', Arial, Helvetica, sans-serif;
      margin: 32px;
      color: #0f172a;
      background: #f8fafc;
    }
    header { margin-bottom: 24px; }
    h1 {
      font-size: 24px;
      margin: 0;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #1e293b;
    }
    .subtitle {
      margin-top: 4px;
      color: #475569;
      font-size: 13px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .header-row-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .customer-info {
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    .customer-info .company-name {
      font-weight: 600;
      color: #1e293b;
      font-size: 14px;
    }
    .export-date {
      text-align: right;
      font-size: 12px;
      color: #64748b;
    }
    .export-date .label {
      font-weight: 600;
      color: #475569;
    }
    .actions {
      margin: 16px 0 24px;
      display: inline-flex;
      gap: 12px;
    }
    .actions button {
      padding: 9px 16px;
      border-radius: 6px;
      border: 1px solid #4338ca;
      background: linear-gradient(135deg, #4f46e5, #4338ca);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(79, 70, 229, 0.18);
    }
    .actions button.secondary {
      border-color: #cbd5f5;
      background: #fff;
      color: #1e293b;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
    }
    .actions button:hover { filter: brightness(0.95); }
    .summary {
      display: flex;
      gap: 32px;
      margin-bottom: 24px;
      padding: 16px 20px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .summary-item .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .summary-item .value {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }
    .summary-item .value.expired { color: #dc2626; }
    .summary-item .value.to-expire { color: #16a34a; }
    .section-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: #fff;
    }
    thead th {
      background: linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 10px;
      color: #475569;
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    thead th.text-right { text-align: right; }
    thead th.text-center { text-align: center; }
    th, td {
      padding: 10px 14px;
      vertical-align: middle;
    }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    tr.header-row { background: #fafafa; }
    tr.header-row td { font-weight: 500; color: #1e293b; }
    tr.detail-row td { color: #475569; }
    td.item-name { font-weight: 600; color: #1e293b; }
    td.text-right { text-align: right; }
    td.text-center { text-align: center; }
    td.font-semibold { font-weight: 600; }
    th.col-border, td.col-border { border-left: 1px solid #e2e8f0; }
    .status-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22c55e;
    }
    footer {
      margin-top: 32px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    @media print {
      body { margin: 12mm; background: #fff; }
      .actions { display: none !important; }
      .section-card { box-shadow: none; border: 1px solid #d1d5db; }
      .summary { border: 1px solid #d1d5db; }
      tr.header-row { background: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .status-dot { background: #22c55e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(t.title)}</h1>
    <div class="subtitle">Scadenziario Clienti</div>
  </header>

  <div class="header-row-flex">
    ${customerHtml}
    <div class="export-date">
      <div class="label">Data stampa:</div>
      <div>${escapeHtml(exportDateLabel)}</div>
    </div>
  </div>

  <div class="actions">
    <button type="button" onclick="window.print();">Stampa</button>
    <button type="button" class="secondary" onclick="window.close()">Chiudi</button>
  </div>

  <div class="summary">
    <div class="summary-item">
      <span class="label">${escapeHtml(t.totalGeneral)}</span>
      <span class="value">${escapeHtml(currency(data.totalGeneral))}</span>
    </div>
    <div class="summary-item">
      <span class="label">${escapeHtml(t.totalExpired)}</span>
      <span class="value expired">${escapeHtml(currency(data.totalExpired))}</span>
    </div>
    <div class="summary-item">
      <span class="label">${escapeHtml(t.totalToExpire)}</span>
      <span class="value to-expire">${escapeHtml(currency(data.totalToExpire))}</span>
    </div>
  </div>

  <div class="section-card">
    <table>
      <thead>
        <tr>
          <th style="width: 22%">${escapeHtml(t.colType)}</th>
          <th style="width: 5%" class="text-center"></th>
          <th style="width: 12%" class="col-border">${escapeHtml(t.colDate)}</th>
          <th style="width: 13%" class="text-right col-border">${escapeHtml(t.colTotal)}</th>
          <th style="width: 18%" class="col-border">${escapeHtml(t.colDocument)}</th>
          <th style="width: 12%" class="col-border">${escapeHtml(t.colDate)}</th>
          <th style="width: 13%" class="text-right col-border">${escapeHtml(t.colAmount)}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8;">Nessuna scadenza</td></tr>'}
      </tbody>
    </table>
  </div>

  <footer>
    Documento generato automaticamente &bull; ${escapeHtml(exportDateLabel)}
  </footer>
</body>
</html>`;
}

export function openDeadlinesPrintWindow(
  options: DeadlinesExportOptions,
): void {
  if (typeof window === 'undefined') return;

  const html = renderDeadlinesPdfHtml(options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, '_blank');

  if (!popup) {
    URL.revokeObjectURL(url);
    alert('Abilita i popup per stampare lo scadenziario.');
    return;
  }

  // Cleanup URL after popup closes or after timeout
  let pollId: number | undefined;
  let fallbackTimer: number | undefined;
  let completed = false;

  const cleanup = () => {
    if (completed) return;
    completed = true;
    if (pollId != null) window.clearInterval(pollId);
    if (fallbackTimer != null) window.clearTimeout(fallbackTimer);
    URL.revokeObjectURL(url);
  };

  pollId = window.setInterval(() => {
    if (popup.closed) {
      cleanup();
    }
  }, 500);

  // Fallback cleanup after 5 minutes
  fallbackTimer = window.setTimeout(
    () => {
      cleanup();
    },
    5 * 60 * 1000,
  );
}
