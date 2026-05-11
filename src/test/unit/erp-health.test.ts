import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  reportErpFailure,
  reportErpSuccess,
  getErpHealthSnapshot,
  subscribeErpHealth,
} from '@framework/erp/erp-health';

describe('erp-health store', () => {
  beforeEach(() => {
    // reset to healthy before each test
    reportErpSuccess();
  });

  it('starts healthy', () => {
    expect(getErpHealthSnapshot()).toBe(false);
  });

  it('reportErpFailure flips to unhealthy', () => {
    reportErpFailure();
    expect(getErpHealthSnapshot()).toBe(true);
  });

  it('reportErpSuccess flips back to healthy', () => {
    reportErpFailure();
    reportErpSuccess();
    expect(getErpHealthSnapshot()).toBe(false);
  });

  it('notifies subscribers on state change', () => {
    const listener = vi.fn();
    const unsub = subscribeErpHealth(listener);
    reportErpFailure();
    expect(listener).toHaveBeenCalledTimes(1);
    reportErpSuccess();
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
  });

  it('does not over-notify on idempotent calls', () => {
    const listener = vi.fn();
    const unsub = subscribeErpHealth(listener);
    reportErpFailure();
    reportErpFailure();
    expect(listener).toHaveBeenCalledTimes(1);
    reportErpSuccess();
    reportErpSuccess();
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsub = subscribeErpHealth(listener);
    unsub();
    reportErpFailure();
    expect(listener).not.toHaveBeenCalled();
  });
});
