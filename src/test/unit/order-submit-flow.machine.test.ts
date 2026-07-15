import { describe, it, expect } from 'vitest';
import {
  phaseToStage,
  copyTier,
  orderSubmitFlowReducer,
  initialFlowState,
  SLOW_MS,
  ALMOST_MS,
  type FlowState,
} from '@/hooks/order-submit-flow.machine';

describe('phaseToStage', () => {
  it('maps before→2, on→3, anything else→1', () => {
    expect(phaseToStage('before')).toBe(2);
    expect(phaseToStage('on')).toBe(3);
    expect(phaseToStage(undefined)).toBe(1);
    expect(phaseToStage('weird')).toBe(1);
  });
});

describe('copyTier', () => {
  it('escalates at the SLOW and ALMOST thresholds', () => {
    expect(copyTier(0)).toBe('normal');
    expect(copyTier(SLOW_MS - 1)).toBe('normal');
    expect(copyTier(SLOW_MS)).toBe('slow');
    expect(copyTier(ALMOST_MS - 1)).toBe('slow');
    expect(copyTier(ALMOST_MS)).toBe('almost');
  });
});

describe('orderSubmitFlowReducer', () => {
  const at = (
    status: FlowState['status'],
    extra: Partial<FlowState> = {},
  ): FlowState => ({
    ...initialFlowState,
    status,
    ...extra,
  });

  it('OPEN → confirm from idle', () => {
    expect(
      orderSubmitFlowReducer(initialFlowState, { type: 'OPEN' }).status,
    ).toBe('confirm');
  });

  it('CONFIRM → submitting, resets stage/elapsed/reconnecting', () => {
    const s = orderSubmitFlowReducer(
      at('confirm', { elapsedMs: 999, reconnecting: true, stage: 3 }),
      { type: 'CONFIRM' },
    );
    expect(s.status).toBe('submitting');
    expect(s.stage).toBe(1);
    expect(s.elapsedMs).toBe(0);
    expect(s.reconnecting).toBe(false);
  });

  it('ENTER_PROCESSING keeps orderId and moves to processing', () => {
    const s = orderSubmitFlowReducer(at('submitting'), {
      type: 'ENTER_PROCESSING',
      orderId: 'ord-1',
    });
    expect(s.status).toBe('processing');
    expect(s.orderId).toBe('ord-1');
  });

  it('SET_PHASE maps phase→stage and clears reconnecting', () => {
    const s = orderSubmitFlowReducer(at('processing', { reconnecting: true }), {
      type: 'SET_PHASE',
      phase: 'on',
    });
    expect(s.stage).toBe(3);
    expect(s.reconnecting).toBe(false);
  });

  it('TICK updates elapsedMs only', () => {
    const s = orderSubmitFlowReducer(at('submitting'), {
      type: 'TICK',
      elapsedMs: 12000,
    });
    expect(s.elapsedMs).toBe(12000);
    expect(s.status).toBe('submitting');
  });

  it('SUCCESS carries the order number and pins stage 3', () => {
    const s = orderSubmitFlowReducer(at('processing', { stage: 2 }), {
      type: 'SUCCESS',
      orderNumber: 'N-42',
    });
    expect(s.status).toBe('success');
    expect(s.stage).toBe(3);
    expect(s.orderNumber).toBe('N-42');
  });

  it('ERROR carries the message', () => {
    const s = orderSubmitFlowReducer(at('processing'), {
      type: 'ERROR',
      message: 'boom',
    });
    expect(s.status).toBe('error');
    expect(s.errorMessage).toBe('boom');
  });

  it('CANCEL and RESET return to a clean idle', () => {
    expect(orderSubmitFlowReducer(at('confirm'), { type: 'CANCEL' })).toEqual(
      initialFlowState,
    );
    expect(
      orderSubmitFlowReducer(at('error', { errorMessage: 'x' }), {
        type: 'RESET',
      }),
    ).toEqual(initialFlowState);
  });
});
