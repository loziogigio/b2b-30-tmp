// src/contexts/address/address.reducer.ts
import { AddressAction, AddressState, addressInitialState } from '@framework/acccount/types-b2b-account';

export function addressReducer(
  state: AddressState = addressInitialState,
  action: AddressAction
): AddressState {
  switch (action.type) {
    case 'SET_SELECTED':
      return { ...state, selected: action.payload };
    case 'RESET':
      return addressInitialState;
    default:
      return state;
  }
}
