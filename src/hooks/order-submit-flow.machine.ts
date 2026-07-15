// Pure state machine for the inline order-submit flow. No React, no timers, no
// network — everything here is deterministic and unit-tested. The hook layer
// (use-order-submit-flow.ts) owns all side effects and dispatches these actions.
//
// Anomalies / duplicate / already-submitted are intentionally NOT statuses here:
// those outcomes dispatch RESET (back to idle) and the existing modals, driven
// by the wrapped useOrderSubmit state, take over.

export type FlowStatus =
  | 'idle'
  | 'confirm'
  | 'submitting'
  | 'processing'
  | 'success'
  | 'error';

/** 1 = Inizio, 2 = Validazione sistema gestionale, 3 = Finalizzazione ordine. */
export type Stage = 1 | 2 | 3;

export type CopyTier = 'normal' | 'slow' | 'almost';

export interface FlowState {
  status: FlowStatus;
  stage: Stage;
  elapsedMs: number;
  reconnecting: boolean;
  orderId?: string;
  orderNumber?: string;
  errorMessage?: string;
}

/** Copy escalates at 10 s and 30 s; the backend's own sync budget is ~10 s. */
export const SLOW_MS = 10_000;
export const ALMOST_MS = 30_000;
/** Poll cadence while async. Matches the reference's responsive 3 s. */
export const POLL_INTERVAL_MS = 3_000;
/** Elapsed-time UI tick. */
export const TICK_MS = 250;
/** Consecutive poll failures before we surface a dismissible error. */
export const MAX_POLL_FAILURES = 5;
/** How long the success state (with the order number) stays before redirect. */
export const SUCCESS_DWELL_MS = 2_500;

export function phaseToStage(phase: string | undefined): Stage {
  if (phase === 'before') return 2;
  if (phase === 'on') return 3;
  return 1;
}

export function copyTier(elapsedMs: number): CopyTier {
  if (elapsedMs >= ALMOST_MS) return 'almost';
  if (elapsedMs >= SLOW_MS) return 'slow';
  return 'normal';
}

export type FlowAction =
  | { type: 'OPEN' }
  | { type: 'CANCEL' }
  | { type: 'CONFIRM' }
  | { type: 'ENTER_PROCESSING'; orderId: string }
  | { type: 'SET_PHASE'; phase: string | undefined }
  | { type: 'TICK'; elapsedMs: number }
  | { type: 'RECONNECTING'; value: boolean }
  | { type: 'SUCCESS'; orderNumber?: string }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

export const initialFlowState: FlowState = {
  status: 'idle',
  stage: 1,
  elapsedMs: 0,
  reconnecting: false,
};

export function orderSubmitFlowReducer(
  state: FlowState,
  action: FlowAction,
): FlowState {
  switch (action.type) {
    case 'OPEN':
      return { ...initialFlowState, status: 'confirm' };
    case 'CANCEL':
    case 'RESET':
      return { ...initialFlowState };
    case 'CONFIRM':
      return {
        ...state,
        status: 'submitting',
        stage: 1,
        elapsedMs: 0,
        reconnecting: false,
        errorMessage: undefined,
      };
    case 'ENTER_PROCESSING':
      return { ...state, status: 'processing', orderId: action.orderId };
    case 'SET_PHASE':
      return {
        ...state,
        stage: phaseToStage(action.phase),
        reconnecting: false,
      };
    case 'TICK':
      return { ...state, elapsedMs: action.elapsedMs };
    case 'RECONNECTING':
      return { ...state, reconnecting: action.value };
    case 'SUCCESS':
      return {
        ...state,
        status: 'success',
        stage: 3,
        reconnecting: false,
        orderNumber: action.orderNumber,
      };
    case 'ERROR':
      return {
        ...state,
        status: 'error',
        reconnecting: false,
        errorMessage: action.message,
      };
    default:
      return state;
  }
}
