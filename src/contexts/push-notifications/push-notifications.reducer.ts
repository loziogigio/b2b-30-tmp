import type { PushPreferences, PushState } from '@framework/push/types';
import {
  DEFAULT_PUSH_PREFERENCES,
  DEFAULT_PUSH_STATE,
} from '@framework/push/types';

export type PushAction =
  | { type: 'SET_SUPPORTED'; supported: boolean }
  | { type: 'SET_PERMISSION'; permission: NotificationPermission }
  | { type: 'SET_SUBSCRIBED'; subscribed: boolean; endpoint?: string | null }
  | { type: 'SET_PREFERENCES'; preferences: Partial<PushPreferences> }
  | { type: 'HYDRATE'; state: Partial<PushState> }
  | { type: 'RESET' };

export function pushReducer(state: PushState, action: PushAction): PushState {
  switch (action.type) {
    case 'SET_SUPPORTED':
      return { ...state, isSupported: action.supported };

    case 'SET_PERMISSION':
      return { ...state, permission: action.permission };

    case 'SET_SUBSCRIBED':
      return {
        ...state,
        isSubscribed: action.subscribed,
        subscriptionEndpoint: action.endpoint ?? null,
      };

    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.preferences },
      };

    case 'HYDRATE':
      return { ...state, ...action.state };

    case 'RESET':
      return DEFAULT_PUSH_STATE;

    default:
      return state;
  }
}

export { DEFAULT_PUSH_STATE, DEFAULT_PUSH_PREFERENCES };
export type { PushState, PushPreferences };
