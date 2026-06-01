import { describe, it, expect } from 'vitest';
import {
  PROFILE_MODELS,
  isProfileModel,
  buildRecordsQuery,
} from '@/lib/profile/vinc-data-models';

describe('PROFILE_MODELS allow-list', () => {
  it('contains the four profile models', () => {
    expect(PROFILE_MODELS).toEqual([
      'historical_order',
      'credit_exposure',
      'invoice',
      'delivery_note',
    ]);
  });
  it('isProfileModel rejects anything else', () => {
    expect(isProfileModel('historical_order')).toBe(true);
    expect(isProfileModel('erp_settings')).toBe(false);
    expect(isProfileModel('../secrets')).toBe(false);
  });
});

describe('buildRecordsQuery', () => {
  it('requires relation_id and sets sane defaults', () => {
    const q = buildRecordsQuery({ relation_id: '015892' });
    expect(q.get('relation_id')).toBe('015892');
    expect(q.get('limit')).toBe('50');
    expect(q.get('sort')).toBe('-data.document_date');
  });

  it('translates status and date range to bracket filters', () => {
    const q = buildRecordsQuery({
      relation_id: '015892',
      status: 'fulfilled',
      date_from: '2026-05-01',
      date_to: '2026-05-31',
      page: 2,
      limit: 20,
    });
    expect(q.get('filter[status]')).toBe('fulfilled');
    expect(q.get('filter[document_date][gte]')).toBe('2026-05-01');
    expect(q.get('filter[document_date][lte]')).toBe('2026-05-31');
    expect(q.get('page')).toBe('2');
    expect(q.get('limit')).toBe('20');
  });

  it('supports document_number lookup and NEVER emits external_ref', () => {
    const q = buildRecordsQuery({
      relation_id: '015892',
      document_number: 'OC/9345',
    });
    expect(q.get('filter[document_number]')).toBe('OC/9345');
    expect(q.get('external_ref')).toBeNull();
  });
});
