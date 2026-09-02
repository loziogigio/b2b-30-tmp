import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ACCOUNT_CONFIG,
  asSectionVisible,
  isAccountSectionVisible,
  type AccountConfig,
} from '@/lib/erp/account-config.types';
import { mapAccountRecord } from '@/lib/erp/account-config';

describe('account settings config', () => {
  // Every one of these sections was visible before the flags existed, so an
  // absent or partial record must never hide anything.
  it('defaults both sections visible', () => {
    expect(DEFAULT_ACCOUNT_CONFIG).toEqual({
      showFido: true,
      showDeadlines: true,
    });
  });

  it('maps an empty record to everything visible', () => {
    expect(mapAccountRecord({})).toEqual({
      showFido: true,
      showDeadlines: true,
    });
  });

  it('hides only what is explicitly false', () => {
    expect(mapAccountRecord({ show_fido: false })).toEqual({
      showFido: false,
      showDeadlines: true,
    });
    expect(mapAccountRecord({ show_deadlines: false })).toEqual({
      showFido: true,
      showDeadlines: false,
    });
  });

  it('treats the string "false" as hidden (JSON round-trips)', () => {
    expect(asSectionVisible('false')).toBe(false);
    expect(asSectionVisible(false)).toBe(false);
  });

  it('treats absent / unrecognised values as visible, never hidden', () => {
    for (const v of [undefined, null, '', 'true', true, 1]) {
      expect(asSectionVisible(v)).toBe(true);
    }
  });
});

describe('isAccountSectionVisible', () => {
  const cfg: AccountConfig = { showFido: false, showDeadlines: true };

  it('hides the fido section when the flag is off', () => {
    expect(isAccountSectionVisible('fido', cfg)).toBe(false);
  });

  it('keeps a section whose flag is on', () => {
    expect(isAccountSectionVisible('deadlines', cfg)).toBe(true);
  });

  it('never hides a section it does not govern', () => {
    for (const id of [
      'dashboard',
      'orders',
      'documents',
      'password',
      'profile',
    ]) {
      expect(isAccountSectionVisible(id, cfg)).toBe(true);
    }
  });

  it('hides deadlines when that flag is off', () => {
    expect(
      isAccountSectionVisible('deadlines', {
        showFido: true,
        showDeadlines: false,
      }),
    ).toBe(false);
  });
});
