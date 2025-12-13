//HIDROS
// export  const ERP_STATIC = { id_cart: '0', customer_code: '000031', address_code: '000000' ,  username: 'prova@test.it' , ext_call:true};
//DFL
export type ErpStaticState = {
  id_cart: string;
  customer_code: string;
  address_code: string;
  username: string;
  company_name?: string;
  ext_call: boolean;
};

// Persistent key
const LS_KEY = 'erp-static';

function loadState(): ErpStaticState | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as ErpStaticState;
    return null;
  } catch {
    return null;
  }
}

function saveState(state: ErpStaticState) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

export let ERP_STATIC: ErpStaticState =
  loadState() ||
  ({
    id_cart: '0',
    customer_code: '0',
    address_code: '0',
    username: 'guest@example.com',
    company_name: undefined,
    ext_call: true,
  } as ErpStaticState);

export function setErpStatic(next: Partial<ErpStaticState>) {
  ERP_STATIC = { ...ERP_STATIC, ...next } as ErpStaticState;
  saveState(ERP_STATIC);
}

// Convenience for mapping login payload to ERP state
export function applyLoginToErpStatic(payload: any, username: string) {
  try {
    const msg = payload?.message || {};
    const client_id = msg?.client_id || msg?.clientId || '';
    const firstAddr =
      Array.isArray(msg?.address_codes) && msg.address_codes.length > 0
        ? msg.address_codes[0]
        : null;
    const address_code = firstAddr?.address_code || firstAddr?.Codice || '1';
    const company_name = msg?.company_name || msg?.companyName || undefined;
    setErpStatic({
      customer_code: String(client_id || ''),
      address_code: String(address_code || '1'),
      username,
      company_name,
    });
  } catch {
    // fallback silently
  }
}

// Clear ERP state on logout
export function clearErpStatic() {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(LS_KEY);
    // Reset the in-memory state
    ERP_STATIC = {
      id_cart: '0',
      customer_code: '0',
      address_code: '0',
      username: 'guest@example.com',
      company_name: undefined,
      ext_call: true,
    };
  } catch {}
}

// Clear all B2B session data
export function clearAllB2BSessionData() {
  try {
    if (typeof window === 'undefined') return;
    // Clear ERP static
    window.localStorage.removeItem(LS_KEY);
    // Clear delivery address
    window.localStorage.removeItem('b2b-delivery-address');
    // Clear cart
    window.localStorage.removeItem('vinc-b2b-cart');
    // Reset the in-memory state
    ERP_STATIC = {
      id_cart: '0',
      customer_code: '0',
      address_code: '0',
      username: 'guest@example.com',
      company_name: undefined,
      ext_call: true,
    };
  } catch {}
}

// Hydrate ERP_STATIC from localStorage on client-side
// This is needed because the module initializes on SSR where localStorage doesn't exist
export function hydrateErpStatic(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const stored = loadState();
    if (stored && stored.customer_code && stored.customer_code !== '0') {
      ERP_STATIC = stored;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Check if ERP_STATIC has valid customer context
export function hasValidErpContext(): boolean {
  return Boolean(
    ERP_STATIC.customer_code &&
      ERP_STATIC.address_code &&
      ERP_STATIC.customer_code !== '0',
  );
}
