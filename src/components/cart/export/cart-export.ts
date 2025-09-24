import { Item, CartSummary } from '@contexts/cart/cart.utils';

export interface ExportRowData {
  sku: string;
  name: string;
  model: string;
  quantity: number;
  quantityFormatted: string;
  packaging: {
    unit?: string;
    mv?: string;
    cf?: string;
  };
  unitNet: number;
  unitGross: number;
  lineNet: number;
  lineGross: number;
  image?: string;
}

export interface ExportSnapshot {
  rows: ExportRowData[];
  totals: Array<{ label: string; value: number }>;
  info: Array<[string, string]>;
  exportDateLabel: string;
  filenameStamp: string;
  rowsCount: number;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface BuildSnapshotOptions {
  items: Item[];
  meta: CartSummary | null | undefined;
  totals: { net: number; gross: number; vat: number };
  filteredDiffers: boolean;
  filtersSummary: string;
  sortLabel: string;
}

export function buildCartExportSnapshot(options: BuildSnapshotOptions): ExportSnapshot | null {
  const { items, meta, totals, filteredDiffers, filtersSummary, sortLabel } = options;
  if (!items?.length) return null;

  const exportDate = new Date();
  const exportDateLabel = new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(exportDate);
  const quantityFormatter = new Intl.NumberFormat('it-IT', {
    maximumFractionDigits: 3,
  });

  const summaryTotals = {
    net: Number(meta?.totalNet ?? totals.net ?? 0),
    gross: Number(meta?.totalGross ?? totals.gross ?? 0),
    vat: Number(meta?.vat ?? totals.vat ?? 0),
  };
  const transportCost =
    meta && typeof meta.transportCost === 'number' ? Number(meta.transportCost) : undefined;
  const documentTotal = Number(
    meta?.totalDoc ?? summaryTotals.net + summaryTotals.vat + (transportCost ?? 0)
  );

  const rows: ExportRowData[] = items.map((row, idx) => {
    const qty = Number(row.quantity ?? 0);
    const unitNetValue = Number(row.priceDiscount ?? row.__cartMeta?.price_discount ?? row.price ?? 0);
    const unitGrossValue = Number(
      row.priceGross ?? row.__cartMeta?.gross_price ?? row.gross_price ?? row.price_gross ?? row.price ?? 0
    );
    const unitLabelRaw = row.uom ?? (row as any)?.unit ?? (row as any)?.um;
    const mvRaw = (row as any)?.mvQty ?? (row as any)?.mv_qty ?? (row as any)?.mv;
    const cfRaw = (row as any)?.cfQty ?? (row as any)?.cf_qty ?? (row as any)?.cf;

    return {
      sku: row.sku ?? '',
      name: row.name ?? '',
      model: row.model ?? '',
      quantity: qty,
      quantityFormatted: quantityFormatter.format(qty),
      packaging: {
        unit: unitLabelRaw != null && unitLabelRaw !== '' ? String(unitLabelRaw) : undefined,
        mv: mvRaw != null && mvRaw !== '' ? String(mvRaw) : undefined,
        cf: cfRaw != null && cfRaw !== '' ? String(cfRaw) : undefined,
      },
      unitNet: unitNetValue,
      unitGross: unitGrossValue,
      lineNet: unitNetValue * qty,
      lineGross: unitGrossValue * qty,
      image:
        row.image && typeof row.image === 'string' && row.image.trim().length > 0
          ? row.image.trim()
          : undefined,
    };
  });

  const totalsRows: Array<{ label: string; value: number }> = [{ label: 'Net total', value: summaryTotals.net }];
  if (transportCost != null && Number.isFinite(transportCost) && transportCost !== 0) {
    totalsRows.push({ label: 'Transport cost', value: transportCost });
  }
  totalsRows.push({ label: 'VAT', value: summaryTotals.vat });
  totalsRows.push({ label: 'Document total', value: documentTotal });
  totalsRows.push({ label: 'Gross total', value: summaryTotals.gross });

  const infoRows: Array<[string, string]> = [
    [
      'Cart ID',
      meta?.idCart != null
        ? String(meta.idCart)
        : meta && (meta as any)?.id_cart != null
        ? String((meta as any)?.id_cart)
        : 'N/A',
    ],
    ['Customer ID', meta?.clientId != null ? String(meta.clientId) : 'N/A'],
    ['Address code', meta?.addressCode != null ? String(meta.addressCode) : 'N/A'],
    ['Exported at', exportDateLabel],
    ['Items (exported)', String(items.length)],
  ];

  if (filteredDiffers || filtersSummary !== 'None') {
    infoRows.push(['UI filters', filtersSummary]);
  }

  infoRows.push(['Current sort', sortLabel]);

  const filenameStamp = exportDate
    .toISOString()
    .replace(/[:]/g, '-')
    .replace('T', '_')
    .split('.')[0];

  return {
    rows,
    totals: totalsRows,
    info: infoRows,
    exportDateLabel,
    filenameStamp,
    rowsCount: items.length,
  };
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

export function renderCartPdfHtml(snapshot: ExportSnapshot, options: { includeImages?: boolean } = {}): string {
  const includeImages = options.includeImages !== false;
  const currency = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
  const rowsHtml = snapshot.rows
    .map((row) => {
      const packagingParts: string[] = [];
      if (row.packaging.unit) packagingParts.push(escapeHtml(row.packaging.unit));
      if (row.packaging.mv != null || row.packaging.cf != null) {
        packagingParts.push(
          `<span class="muted">MV ${escapeHtml(row.packaging.mv ?? '-')}/CF ${escapeHtml(row.packaging.cf ?? '-')}</span>`
        );
      }
      const packagingCell = packagingParts.join('<br/>') || '&nbsp;';

      const imgSrc = toAbsoluteImage(row.image);
      const imageCell = includeImages && imgSrc
        ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(row.name || row.sku)}" class="item-image" loading="lazy" />`
        : '<div class="image-placeholder">No image</div>';

      return `
          <tr>
            ${includeImages ? `<td class=\"image-cell\">${imageCell}</td>` : ''}
            <td class=\"item-name\">
              <strong>${escapeHtml(row.sku)}</strong>${includeImages ? '<br />' : ' &mdash; '}${escapeHtml(row.name)}${row.model ? `<br /><span class=\"muted\">Modello: ${escapeHtml(row.model)}</span>` : ''}
            </td>
            <td>${escapeHtml(row.packaging.unit ?? '')}</td>
            <td class=\"text-right\">${escapeHtml(row.quantityFormatted)}</td>
            <td class=\"text-right\">${escapeHtml(currency.format(row.unitNet))}</td>
            <td class=\"text-right\">${escapeHtml(currency.format(row.lineNet))}</td>
          </tr>
        `;
    })
    .join('');

  const totalsHtml = `
      <table class="totals">
        <tbody>
          ${snapshot.totals
            .map(
              ({ label, value }) =>
                `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(currency.format(value))}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;

  const infoHtml = snapshot.info
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>Hidros - Cart export</title>
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
    .section-card {
      background: #fff;
      padding: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 12px;
      background: #fff;
    }
    thead th {
      background: linear-gradient(135deg, #e0e7ff 0%, #eef2ff 100%);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 11px;
      color: #312e81;
      padding: 10px 12px;
      border-bottom: 1px solid #c7d2fe;
    }
    th, td {
      border-bottom: 1px solid #e2e8f0;
      padding: 8px 12px;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #eef2ff; }
    td.item-name { font-weight: 600; color: #1e293b; }
    td.item-name .muted { display: inline-block; margin-top: 4px; font-weight: 500; color: #64748b; }
    .hide-images td.image-cell, .hide-images th.image-header { display: none !important; }
    td.text-right { text-align: right; }
    td.text-center { text-align: center; }
    td.image-cell { text-align: center; }
    .item-image {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px;
      background: #fff;
      box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.15);
    }
    .image-placeholder {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border: 1px dashed #cbd5f5;
      border-radius: 8px;
      color: #94a3b8;
      font-size: 10px;
      background: #f8fafc;
    }
    .muted { color: #64748b; font-size: 10px; display: inline-block; margin-top: 2px; }
    .meta, .totals {
      border: 1px solid #e2e8f0;
      display: inline-table;
      min-width: 360px;
    }
    .meta th, .totals th {
      background: #f1f5f9;
      text-align: left;
      font-weight: 600;
      width: 170px;
      color: #334155;
    }
    .meta td, .totals td { text-align: right; color: #0f172a; }
    footer {
      margin-top: 36px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    @media print {
      body { margin: 12mm; background: #fff; }
      .actions { display: none !important; }
      .section-card { box-shadow: none; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Cart export</h1>
    <div class="subtitle">HidrosPoint B2B</div>
  </header>
  <div class="actions">
    <button type="button" onclick="document.body.classList.remove('hide-images'); window.print();">Print with images</button>
    <button type="button" class="secondary" onclick="document.body.classList.add('hide-images'); window.print(); window.setTimeout(() => document.body.classList.remove('hide-images'), 100);">Print without images</button>
    <button type="button" class="secondary" onclick="window.close()">Close</button>
  </div>
  <section class="section-card">
    <h2>Cart details</h2>
    <table class="meta">
      <tbody>${infoHtml}</tbody>
    </table>
  </section>
  <section class="section-card">
    <h2>Items (${snapshot.rowsCount})</h2>
    <table class="items">
      <thead>
        <tr>
          ${includeImages ? '<th class="image-header">Image</th>' : ''}
          <th>${includeImages ? 'Item' : 'Item code / Item'}</th>
          <th>UM</th>
          <th>QTY</th>
          <th>Unit net</th>
          <th>Line net</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </section>
  <section class="section-card">
    <h2>Totals</h2>
    ${totalsHtml}
  </section>
  <footer>
    Generated automatically by Hidros customer portal • ${escapeHtml(snapshot.exportDateLabel)}
  </footer>
</body>
</html>`;
}

export function renderCartExcelHtml(snapshot: ExportSnapshot): string {
  const formatNumber = (value: number, fractionDigits = 2) =>
    Number.isFinite(value) ? value.toFixed(fractionDigits) : '';

  const rowsHtml = snapshot.rows
    .map((row) => {
      const packagingLines: string[] = [];
      if (row.packaging.unit) packagingLines.push(escapeHtml(row.packaging.unit));
      if (row.packaging.mv != null || row.packaging.cf != null) {
        packagingLines.push(
          `MV ${escapeHtml(row.packaging.mv ?? '-')}/CF ${escapeHtml(row.packaging.cf ?? '-')}`
        );
      }
      const packagingCell = packagingLines.join('<br/>') || '&nbsp;';

      return `
          <tr>
            <td>${escapeHtml(row.sku)}</td>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.model)}</td>
            <td style="mso-number-format:'0.000'; text-align:right;">${formatNumber(row.quantity, 3)}</td>
            <td>${packagingCell}</td>
            <td style="mso-number-format:'0.00'; text-align:right;">${formatNumber(row.unitNet)}</td>
            <td style="mso-number-format:'0.00'; text-align:right;">${formatNumber(row.unitGross)}</td>
            <td style="mso-number-format:'0.00'; text-align:right;">${formatNumber(row.lineNet)}</td>
            <td style="mso-number-format:'0.00'; text-align:right;">${formatNumber(row.lineGross)}</td>
          </tr>
        `;
    })
    .join('');

  const totalsHtml = snapshot.totals
    .map(
      ({ label, value }) =>
        `<tr><th>${escapeHtml(label)}</th><td style="mso-number-format:'0.00'; text-align:right;">${formatNumber(value)}</td></tr>`
    )
    .join('');

  const infoHtml = snapshot.info
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Cart export</title>
  <style>
    table { border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 6px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
    thead th { background: #f3f4f6; font-weight: 600; }
    .meta { width: 100%; max-width: 420px; }
    .totals { width: 280px; margin-left: auto; }
  </style>
</head>
<body>
  <table class="meta">
    <tbody>${infoHtml}</tbody>
  </table>
  <br />
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>SKU</th>
        <th>Item</th>
        <th>Model</th>
        <th>Quantity</th>
        <th>Packaging</th>
        <th>Unit net</th>
        <th>Unit gross</th>
        <th>Line net</th>
        <th>Line gross</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <br />
  <table class="totals">
    <tbody>${totalsHtml}</tbody>
  </table>
</body>
</html>`;
}
