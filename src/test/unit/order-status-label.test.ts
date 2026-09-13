import { describe, it, expect } from 'vitest';
import { orderStatusLabel } from '@utils/order-status-label';

// Echo the key so assertions read the i18n key, not a locale string.
const t = (key: string) => key;

describe('orderStatusLabel', () => {
  it('maps MyMB StatoTestataOrdine codes to the same keys the orders list uses', () => {
    expect(orderStatusLabel({ status: 'NE' }, t)).toBe(
      'order-status-to-fulfill',
    );
    expect(orderStatusLabel({ status: 'E' }, t)).toBe('order-status-fulfilled');
    expect(orderStatusLabel({ status: 'EV' }, t)).toBe(
      'order-status-fulfilled',
    );
    expect(orderStatusLabel({ status: 'IA' }, t)).toBe('order-status-waiting');
  });

  it('prefers the VINC pre-resolved label when the record carries one', () => {
    expect(
      orderStatusLabel({ status: 'to_fulfill', statusLabel: 'Da evadere' }, t),
    ).toBe('Da evadere');
  });

  it('keeps the legacy hub vocabulary working', () => {
    expect(orderStatusLabel({ status: 'order-pending' }, t)).toBe(
      'order-status-pending',
    );
    expect(orderStatusLabel({ order_status: 'processing' }, t)).toBe(
      'order-status-processing',
    );
    expect(orderStatusLabel({ status: 'out-for-delivery' }, t)).toBe(
      'order-status-out-for-delivery',
    );
    expect(orderStatusLabel({ status: 'at-local-facility' }, t)).toBe(
      'order-status-at-local-facility',
    );
  });

  it('falls back to "completed" only when there is no status at all', () => {
    expect(orderStatusLabel({}, t)).toBe('order-status-completed');
    expect(orderStatusLabel({ status: '' }, t)).toBe('order-status-completed');
    expect(orderStatusLabel({ status: 'completed' }, t)).toBe(
      'order-status-completed',
    );
  });
});
