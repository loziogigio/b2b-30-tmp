// Export utilities for product comparison
import type { ComparisonProduct } from '@/components/product/ProductComparisonTable';

/**
 * Export comparison data to Excel (CSV format)
 */
export function exportToExcel(products: ComparisonProduct[]) {
  if (!products.length) return;

  // Collect all unique feature labels
  const featureLabels = Array.from(
    new Set(products.flatMap((p) => p.features.map((f) => f.label))),
  );

  // Build CSV header
  const headers = [
    'SKU',
    'Product',
    'Model',
    'Price',
    'Availability',
    ...featureLabels,
  ];

  // Build CSV rows
  const rows = products.map((product) => {
    const price = product.priceData?.price_discount || product.priceData?.price;
    const priceDisplay = price != null ? `€ ${price.toFixed(2)}` : '—';

    const row: string[] = [
      product.sku,
      product.title,
      product.model,
      priceDisplay,
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
 * Export comparison data to PDF
 */
export async function exportToPDF(products: ComparisonProduct[]) {
  if (!products.length) return;

  // Dynamically import jsPDF to avoid SSR issues
  const jsPDF = (await import('jspdf')).default;
  await import('jspdf-autotable'); // Extends jsPDF prototype

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Add title
  doc.setFontSize(16);
  doc.text('Product Comparison', 14, 15);

  // Add timestamp
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  // Collect all unique feature labels
  const featureLabels = Array.from(
    new Set(products.flatMap((p) => p.features.map((f) => f.label))),
  );

  // Build table data
  const headers = [['Specification', ...products.map((p) => p.title)]];

  const rows = [
    ['SKU', ...products.map((p) => p.sku)],
    ['Model', ...products.map((p) => p.model)],
    [
      'Price',
      ...products.map((p) => {
        const price = p.priceData?.price_discount || p.priceData?.price;
        return price != null ? `€ ${price.toFixed(2)}` : '—';
      }),
    ],
    ['Availability', ...products.map((p) => p.availabilityText || '—')],
    ...featureLabels.map((label) => [
      label,
      ...products.map((product) => {
        const feature = product.features.find((f) => f.label === label);
        return feature?.value || '—';
      }),
    ]),
  ];

  // Generate table using autoTable (extended on jsPDF prototype)
  (doc as any).autoTable({
    startY: 28,
    head: headers,
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [71, 85, 105], // slate-600
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252] }, // First column
    },
  });

  // Download
  doc.save(`product-comparison-${Date.now()}.pdf`);
}
