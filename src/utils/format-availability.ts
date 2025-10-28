// src/utils/format-availability.ts
import type { ErpPriceData } from './transform/erp-prices';

export function formatAvailability(avail: number, uom: string = ''): string {
    if (typeof avail !== 'number') return `In Stock 0 ${uom}`;
    if (avail <= 0) return 'Not In Stock';
    if (avail <= 10) return `In Stock >1 ${uom}`;
    if (avail <= 100) return `In Stock >10 ${uom}`;
    return `In Stock >100 ${uom}`;
  }

/**
 * Generalized availability display - follows the standard pattern from product-card-b2b
 * Returns availability text based on ERP price data
 */
export function getAvailabilityDisplay(priceData?: ErpPriceData): string {
  if (!priceData) return '—';

  const availability = Number(priceData.availability);

  // If in stock, show formatted availability
  if (availability > 0) {
    return formatAvailability(
      availability,
      priceData.packaging_option_default?.packaging_uom
    );
  }

  // Out of stock: show label from ERP (e.g., "Not available", "Discontinued")
  return priceData.product_label_action?.LABEL ?? '—';
}
  