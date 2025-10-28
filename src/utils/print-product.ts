// Print utility for product detail pages
import type { Product } from '@framework/types';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { getAvailabilityDisplay } from '@utils/format-availability';

/**
 * Print product detail page
 */
export function printProductDetail(product: Product, priceData?: ErpPriceData) {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to print');
    return;
  }

  // Build HTML content
  const html = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Print: ${product.name || product.sku}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          padding: 20mm;
          color: #1e293b;
          line-height: 1.6;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
        }

        .logo-section {
          flex: 1;
        }

        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #0f172a;
        }

        .print-date {
          font-size: 12px;
          color: #64748b;
          margin-top: 5px;
        }

        .product-section {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        .product-image {
          width: 200px;
          height: 200px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          background: #f8fafc;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .product-info h1 {
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #0f172a;
        }

        .sku-badge {
          display: inline-block;
          background: #0f172a;
          color: white;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 15px;
        }

        .description {
          color: #475569;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }

        .info-item {
          background: #f8fafc;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .info-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }

        .price-box {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .price-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .price-value {
          font-size: 28px;
          font-weight: bold;
          color: #0f172a;
        }

        .features-section {
          margin-top: 30px;
          page-break-inside: avoid;
        }

        .section-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e2e8f0;
          color: #0f172a;
        }

        .features-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        .features-table th,
        .features-table td {
          padding: 10px;
          text-align: left;
          border: 1px solid #e2e8f0;
        }

        .features-table th {
          background: #f8fafc;
          font-weight: 600;
          font-size: 12px;
          color: #64748b;
        }

        .features-table td {
          font-size: 13px;
          color: #1e293b;
        }

        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          font-size: 11px;
          color: #64748b;
          text-align: center;
        }

        @media print {
          body {
            padding: 10mm;
          }

          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          <div class="company-name">Product Specification</div>
          <div class="print-date">Generated: ${new Date().toLocaleString('it-IT')}</div>
        </div>
      </div>

      <div class="product-section">
        <div class="product-image">
          ${product.image?.original || product.image?.thumbnail
            ? `<img src="${product.image.original || product.image.thumbnail}" alt="${product.name || 'Product'}" />`
            : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#cbd5e1;">No Image</div>'
          }
        </div>

        <div class="product-info">
          <span class="sku-badge">${product.sku || '—'}</span>
          <h1>${product.name || 'Product Name'}</h1>
          ${product.description ? `<p class="description">${product.description}</p>` : ''}

          <div class="info-grid">
            ${product.model ? `
              <div class="info-item">
                <div class="info-label">Model</div>
                <div class="info-value">${product.model}</div>
              </div>
            ` : ''}

            ${product.brand?.name ? `
              <div class="info-item">
                <div class="info-label">Brand</div>
                <div class="info-value">${product.brand.name}</div>
              </div>
            ` : ''}

            ${priceData ? `
              <div class="info-item">
                <div class="info-label">Availability</div>
                <div class="info-value">${getAvailabilityDisplay(priceData)}</div>
              </div>
            ` : ''}

            ${priceData?.packaging_option_default?.packaging_uom ? `
              <div class="info-item">
                <div class="info-label">Packaging</div>
                <div class="info-value">${priceData.packaging_option_default.packaging_uom}</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      ${priceData && (priceData.price_discount || priceData.price) ? `
        <div class="price-box">
          <div class="price-label">Price</div>
          <div style="display:flex;align-items:baseline;gap:12px;">
            ${priceData.gross_price && Number(priceData.gross_price) !== Number(priceData.price_discount || priceData.price) ? `
              <div style="text-decoration:line-through;color:#64748b;font-size:16px;">
                € ${Number(priceData.gross_price).toFixed(2)}
              </div>
            ` : ''}
            <div class="price-value" style="${priceData.is_promo ? 'color:#dc2626;' : ''}">
              € ${Number(priceData.price_discount || priceData.price).toFixed(2)}
            </div>
          </div>
          ${priceData.is_promo ? '<div style="display:inline-block;background:#dc2626;color:white;padding:4px 12px;border-radius:9999px;font-size:11px;margin-top:8px;font-weight:600;">PROMO</div>' : ''}
          ${priceData.discount_description ? `
            <div style="color:#64748b;font-size:12px;margin-top:8px;line-height:1.5;">
              ${String(priceData.discount_description).split(/<br\s*\/?>|\n|\|/gi).map(line => line.trim()).filter(Boolean).join('<br>')}
            </div>
          ` : ''}
          ${priceData.count_promo && priceData.count_promo > 0 ? `
            <div style="background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:8px 12px;border-radius:6px;font-size:11px;margin-top:8px;font-weight:600;">
              +${priceData.count_promo} additional promotion${priceData.count_promo > 1 ? 's' : ''} available
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${product.features && Object.keys(product.features).length > 0 ? `
        <div class="features-section">
          <h2 class="section-title">Technical Specifications</h2>
          <table class="features-table">
            <thead>
              <tr>
                <th style="width: 40%;">Feature</th>
                <th style="width: 60%;">Value</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(product.features as Record<string, any>)
                .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                .map(([key, value]) => `
                  <tr>
                    <td><strong>${key}</strong></td>
                    <td>${value}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="footer">
        This document was automatically generated on ${new Date().toLocaleDateString('it-IT')} at ${new Date().toLocaleTimeString('it-IT')}
      </div>
    </body>
    </html>
  `;

  // Write content and trigger print
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for images to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Close window after print dialog
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 250);
  };
}
