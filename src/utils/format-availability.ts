// src/utils/format-availability.ts
export function formatAvailability(avail: number, uom: string = ''): string {
    if (typeof avail !== 'number') return `In Stock 0 ${uom}`;
    if (avail <= 0) return 'Not In Stock';
    if (avail <= 10) return `In Stock >1 ${uom}`;
    if (avail <= 100) return `In Stock >10 ${uom}`;
    return `In Stock >100 ${uom}`;
  }
  