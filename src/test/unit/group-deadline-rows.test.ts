import { describe, it, expect } from 'vitest';
import {
  groupDeadlineRows,
  isDeadlineExpired,
} from '@/utils/transform/group-deadline-rows';
import type { PaymentDeadlineRow } from '@framework/acccount/types-b2b-account';

const header = (description: string, dueDate?: string): PaymentDeadlineRow => ({
  description,
  dueDate,
  amount: 0,
  total: 100,
  isDueView: true,
  isReferenceView: false,
});

const detail = (document: string): PaymentDeadlineRow => ({
  description: '',
  document,
  amount: 10,
  total: 0,
  isDueView: false,
  isReferenceView: true,
});

describe('groupDeadlineRows', () => {
  it('attaches each detail row to the header above it', () => {
    const groups = groupDeadlineRows([
      header('NOTE DI CREDITO CLIENTI'),
      detail('AC/2026/129'),
      header('BONIFICO BANCARIO ATTIVO'),
      detail('VEN/2026/2716'),
      detail('VEN/2026/2717'),
      detail('VEN/2026/2718'),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].details.map((d) => d.document)).toEqual(['AC/2026/129']);
    expect(groups[1].header.description).toBe('BONIFICO BANCARIO ATTIVO');
    expect(groups[1].details.map((d) => d.document)).toEqual([
      'VEN/2026/2716',
      'VEN/2026/2717',
      'VEN/2026/2718',
    ]);
  });

  it('keeps a header with no details', () => {
    const groups = groupDeadlineRows([header('SOLO')]);
    expect(groups).toEqual([{ header: header('SOLO'), details: [] }]);
  });

  it('drops orphan detail rows that precede any header', () => {
    const groups = groupDeadlineRows([detail('ORPHAN'), header('A')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].details).toEqual([]);
  });

  it('returns no groups for an empty list', () => {
    expect(groupDeadlineRows([])).toEqual([]);
  });
});

describe('isDeadlineExpired', () => {
  const now = new Date('2026-07-16T10:00:00Z');

  it('marks a past due date expired', () => {
    expect(isDeadlineExpired(header('x', '2026-03-17'), now)).toBe(true);
  });

  it('does not mark a future due date expired', () => {
    expect(isDeadlineExpired(header('x', '2026-11-30'), now)).toBe(false);
  });

  it('does not mark today expired', () => {
    expect(isDeadlineExpired(header('x', '2026-07-16'), now)).toBe(false);
  });

  it('does not mark a row without a due date expired', () => {
    expect(isDeadlineExpired(header('x', undefined), now)).toBe(false);
  });
});
