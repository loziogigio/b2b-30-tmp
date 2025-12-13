export interface OrderExportItem {
  sku: string;
  name: string;
  image?: string;
  unit: string;
  price: number;
  ordered_in_quantity: number;
  delivered_in_quantity: number;
  delivered_in_price: number;
}

export interface OrderExportSnapshot {
  orderNumber: string;
  orderDate: string;
  status: string;
  shippingAddress: {
    line1?: string;
    city?: string;
    country?: string;
  };
  items: OrderExportItem[];
  total: number;
  exportDateLabel: string;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toAbsoluteImage(src?: string) {
  if (!src) return undefined;
  if (src.startsWith('data:')) return src;
  try {
    if (typeof window !== 'undefined') {
      return new URL(src, window.location.origin).href;
    }
  } catch {
    // ignore malformed URL
  }
  return src;
}

export function renderOrderPrintHtml(
  snapshot: OrderExportSnapshot,
  options: { includeImages?: boolean } = {},
): string {
  const includeImages = options.includeImages !== false;
  const currency = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  });
  const numberFormat = new Intl.NumberFormat('it-IT', {
    maximumFractionDigits: 2,
  });

  const rowsHtml = snapshot.items
    .map((item) => {
      const imgSrc = toAbsoluteImage(item.image);
      const imageCell =
        includeImages && imgSrc
          ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.name || item.sku)}" class="item-image" loading="lazy" />`
          : '<div class="image-placeholder">-</div>';

      const deliveredState =
        item.delivered_in_quantity >= item.ordered_in_quantity
          ? 'full'
          : item.delivered_in_quantity > 0
            ? 'partial'
            : 'none';

      const statusDot =
        deliveredState === 'full'
          ? '<span class="status-dot full"></span>'
          : deliveredState === 'partial'
            ? '<span class="status-dot partial"></span>'
            : '<span class="status-dot none"></span>';

      return `
        <tr>
          ${includeImages ? `<td class="image-cell">${imageCell}</td>` : ''}
          <td class="item-name">
            <strong>${escapeHtml(item.sku)}</strong><br />${escapeHtml(item.name)}
          </td>
          <td class="text-center">${escapeHtml(currency.format(item.price))}</td>
          <td class="text-center">${escapeHtml(numberFormat.format(item.ordered_in_quantity))} ${escapeHtml(item.unit)}</td>
          <td class="text-center">${escapeHtml(currency.format(item.delivered_in_price))}</td>
          <td class="text-center">${statusDot} ${escapeHtml(numberFormat.format(item.delivered_in_quantity))} ${escapeHtml(item.unit)}</td>
        </tr>
      `;
    })
    .join('');

  const addressLines = [
    snapshot.shippingAddress.line1,
    snapshot.shippingAddress.city,
    snapshot.shippingAddress.country,
  ]
    .filter(Boolean)
    .join(', ');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>Ordine ${escapeHtml(snapshot.orderNumber)}</title>
  <style>
    :root { color-scheme: only light; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Segoe UI', Arial, Helvetica, sans-serif;
      margin: 32px;
      color: #0f172a;
      background: #f8fafc;
    }
    header { margin-bottom: 32px; }
    h1 {
      font-size: 28px;
      margin: 0;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .subtitle {
      margin-top: 4px;
      color: #475569;
      font-size: 14px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    h2 {
      font-size: 18px;
      margin: 32px 0 12px;
      color: #1e293b;
    }
    .actions {
      margin: 16px 0 24px;
      display: inline-flex;
      gap: 12px;
    }
    .actions button {
      padding: 9px 16px;
      border-radius: 6px;
      border: 1px solid #0d9488;
      background: linear-gradient(135deg, #14b8a6, #0d9488);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(13, 148, 136, 0.18);
    }
    .actions button.secondary {
      border-color: #cbd5e1;
      background: #fff;
      color: #1e293b;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
    }
    .actions button:hover { filter: brightness(0.95); }
    .section-card {
      background: #fff;
      padding: 24px;
      margin-bottom: 16px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .order-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .info-item label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .info-item .value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 12px;
      background: #fff;
    }
    thead th {
      background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 11px;
      color: #115e59;
      padding: 10px 12px;
      border-bottom: 1px solid #99f6e4;
    }
    th, td {
      border-bottom: 1px solid #e2e8f0;
      padding: 8px 12px;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #f0fdfa; }
    td.item-name { font-weight: 600; color: #1e293b; }
    .hide-images td.image-cell, .hide-images th.image-header { display: none !important; }
    td.text-right { text-align: right; }
    td.text-center { text-align: center; }
    td.image-cell { text-align: center; }
    .item-image {
      width: 56px;
      height: 56px;
      object-fit: contain;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 4px;
      background: #fff;
    }
    .image-placeholder {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      color: #94a3b8;
      font-size: 10px;
      background: #f8fafc;
    }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 4px;
    }
    .status-dot.full { background: #22c55e; }
    .status-dot.partial { background: #eab308; }
    .status-dot.none { background: #ef4444; }
    .total-row {
      font-size: 16px;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      padding: 16px 0;
      border-top: 2px solid #e2e8f0;
      margin-top: 16px;
    }
    footer {
      margin-top: 36px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    @media print {
      body { margin: 12mm; background: #fff; }
      .actions { display: none !important; }
      .section-card { box-shadow: none; border: 1px solid #e2e8f0; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Dettaglio Ordine</h1>
    <div class="subtitle">${escapeHtml(snapshot.orderNumber)}</div>
  </header>
  <div class="actions">
    <button type="button" onclick="document.body.classList.remove('hide-images'); window.print();">Stampa con immagini</button>
    <button type="button" class="secondary" onclick="document.body.classList.add('hide-images'); window.print(); window.setTimeout(() => document.body.classList.remove('hide-images'), 100);">Stampa senza immagini</button>
    <button type="button" class="secondary" onclick="window.close()">Chiudi</button>
  </div>
  <section class="section-card">
    <div class="order-info">
      <div class="info-item">
        <label>Numero Ordine</label>
        <div class="value">${escapeHtml(snapshot.orderNumber)}</div>
      </div>
      <div class="info-item">
        <label>Data</label>
        <div class="value">${escapeHtml(snapshot.orderDate)}</div>
      </div>
      <div class="info-item">
        <label>Stato</label>
        <div class="value">${escapeHtml(snapshot.status)}</div>
      </div>
      <div class="info-item">
        <label>Totale</label>
        <div class="value">${escapeHtml(currency.format(snapshot.total))}</div>
      </div>
    </div>
  </section>
  <section class="section-card">
    <h2>Indirizzo di Spedizione</h2>
    <p style="margin: 0; color: #475569;">${escapeHtml(addressLines) || 'Non specificato'}</p>
  </section>
  <section class="section-card">
    <h2>Articoli (${snapshot.items.length})</h2>
    <table class="items">
      <thead>
        <tr>
          ${includeImages ? '<th class="image-header">Img</th>' : ''}
          <th>Articolo</th>
          <th>Prezzo Unit.</th>
          <th>Qta Ord.</th>
          <th>Prezzo</th>
          <th>Qta Cons.</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    <div class="total-row">
      <span>Totale Ordine</span>
      <span>${escapeHtml(currency.format(snapshot.total))}</span>
    </div>
  </section>
  <footer>
    Generato automaticamente dal portale clienti • ${escapeHtml(snapshot.exportDateLabel)}
  </footer>
</body>
</html>`;
}
