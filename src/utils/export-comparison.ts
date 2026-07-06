// Export utilities for product comparison
import type { ComparisonProduct } from '@/components/product/ProductComparisonTable';

/** Column/heading labels — pass t()-resolved strings from the caller. */
export interface ExportLabels {
  sku: string;
  product: string;
  model: string;
  price: string;
  availability: string;
  specification: string;
  title: string;
  generated: string;
}

const DEFAULT_LABELS: ExportLabels = {
  sku: 'SKU',
  product: 'Product',
  model: 'Model',
  price: 'Price',
  availability: 'Availability',
  specification: 'Specification',
  title: 'Product Comparison',
  generated: 'Generated',
};

interface ExportOptions {
  hidePrices?: boolean;
  priceDecimals?: number;
  labels?: Partial<ExportLabels>;
}

/**
 * Export comparison data to Excel (CSV format)
 */
export function exportToExcel(
  products: ComparisonProduct[],
  options?: ExportOptions,
) {
  if (!products.length) return;
  const hp = options?.hidePrices === true;
  const decimals = options?.priceDecimals ?? 2;
  const L = { ...DEFAULT_LABELS, ...options?.labels };

  // Collect all unique feature labels
  const featureLabels = Array.from(
    new Set(products.flatMap((p) => p.features.map((f) => f.label))),
  );

  // Build CSV header
  const headers = [
    L.sku,
    L.product,
    L.model,
    ...(hp ? [] : [L.price]),
    L.availability,
    ...featureLabels,
  ];

  // Build CSV rows
  const rows = products.map((product) => {
    const price = product.priceData?.price_discount || product.priceData?.price;
    const priceDisplay = price != null ? `€ ${price.toFixed(decimals)}` : '—';

    const row: string[] = [
      product.sku,
      product.title,
      product.model,
      ...(hp ? [] : [priceDisplay]),
      product.availabilityText || '—',
    ];

    // Add feature values in the same order as headers
    featureLabels.forEach((label) => {
      const feature = product.features.find((f) => f.label === label);
      row.push(feature?.value || '—');
    });

    return row;
  });

  // Convert to CSV
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `product-comparison-${Date.now()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export comparison data to PDF (HTML-based, opens print dialog)
 */
export function exportToPDF(
  products: ComparisonProduct[],
  options?: ExportOptions,
) {
  if (!products.length) return;
  const hp = options?.hidePrices === true;
  const decimals = options?.priceDecimals ?? 2;
  const L = { ...DEFAULT_LABELS, ...options?.labels };

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Collect all unique feature labels
  const featureLabels = Array.from(
    new Set(products.flatMap((p) => p.features.map((f) => f.label))),
  );

  // Build specification rows: [label, ...values]
  const specRows = [
    [L.sku, ...products.map((p) => p.sku)],
    [L.model, ...products.map((p) => p.model)],
    ...(hp
      ? []
      : [
          [
            L.price,
            ...products.map((p) => {
              const price = p.priceData?.price_discount || p.priceData?.price;
              return price != null ? `€ ${price.toFixed(decimals)}` : '—';
            }),
          ],
        ]),
    [L.availability, ...products.map((p) => p.availabilityText || '—')],
    ...featureLabels.map((label) => [
      label,
      ...products.map((product) => {
        const feature = product.features.find((f) => f.label === label);
        return feature?.value || '—';
      }),
    ]),
  ];

  const headerCells = products.map((p) => `<th>${esc(p.title)}</th>`).join('');
  const bodyRows = specRows
    .map(
      ([label, ...values]) =>
        `<tr><td class="label">${esc(label)}</td>${values.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${esc(L.title)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; padding:20px; color:#1e293b; }
  h1 { font-size:18px; margin-bottom:4px; }
  .timestamp { font-size:11px; color:#64748b; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th, td { border:1px solid #cbd5e1; padding:6px 8px; text-align:left; }
  th { background:#475569; color:#fff; font-weight:600; }
  td.label { font-weight:600; background:#f8fafc; white-space:nowrap; }
  tr:nth-child(even) td:not(.label) { background:#f8fafc; }
  @media print { body { padding:0; } }
</style>
</head><body>
<h1>${esc(L.title)}</h1>
<p class="timestamp">${esc(L.generated)}: ${new Date().toLocaleString()}</p>
<table>
  <thead><tr><th>${esc(L.specification)}</th>${headerCells}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, '_blank');
  if (popup) {
    popup.addEventListener('afterprint', () => URL.revokeObjectURL(url));
    popup.onload = () => popup.print();
  } else {
    URL.revokeObjectURL(url);
  }
}
