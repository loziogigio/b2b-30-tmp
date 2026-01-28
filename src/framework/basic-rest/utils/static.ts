export type ErpStaticState = {
  id_cart: string;
  customer_code: string;
  address_code: string;
  username: string;
  company_name?: string;
  ext_call: boolean;
  // VINC API fields (UUIDs)
  vinc_customer_id?: string;
  vinc_address_id?: string;
  // Tenant/project code for multi-tenant deployments
  project_code?: string;
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
  // IMPORTANT: Mutate the existing object instead of replacing it
  // This ensures all modules that imported ERP_STATIC see the updated values
  Object.assign(ERP_STATIC, next);
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

// Map VINC API profile to ERP static state
export function applyVincProfileToErpStatic(
  profile: {
    email: string;
    customers?: Array<{
      id: string;
      erp_customer_id: string;
      name?: string;
      business_name?: string;
      addresses?: Array<{
        id: string;
        erp_address_id: string;
      }>;
    }>;
  } | null,
) {
  try {
    console.log('[applyVincProfileToErpStatic] profile:', profile);
    if (!profile) {
      console.log('[applyVincProfileToErpStatic] No profile, returning');
      return;
    }
    const firstCustomer = profile.customers?.[0];
    const firstAddress = firstCustomer?.addresses?.[0];
    console.log('[applyVincProfileToErpStatic] firstCustomer:', firstCustomer);
    console.log('[applyVincProfileToErpStatic] firstAddress:', firstAddress);
    setErpStatic({
      customer_code: firstCustomer?.erp_customer_id || '',
      address_code: firstAddress?.erp_address_id || '1',
      username: profile.email,
      company_name: firstCustomer?.business_name || firstCustomer?.name,
      // Store VINC API UUIDs for direct API calls
      vinc_customer_id: firstCustomer?.id || '',
      vinc_address_id: firstAddress?.id || '',
    });
    console.log(
      '[applyVincProfileToErpStatic] ERP_STATIC after set:',
      ERP_STATIC,
    );
  } catch (err) {
    console.error('[applyVincProfileToErpStatic] Error:', err);
  }
}

// Clear ERP state on logout
export function clearErpStatic() {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(LS_KEY);
    // Reset the in-memory state by mutating (not replacing)
    Object.assign(ERP_STATIC, {
      id_cart: '0',
      customer_code: '0',
      address_code: '0',
      username: 'guest@example.com',
      company_name: undefined,
      ext_call: true,
      vinc_customer_id: undefined,
      vinc_address_id: undefined,
    });
  } catch {}
}

// Clear all B2B session data
export function clearAllB2BSessionData() {
  try {
    if (typeof window === 'undefined') return;
    console.log('[clearAllB2BSessionData] Clearing all B2B session data...');
    // Clear ERP static
    window.localStorage.removeItem(LS_KEY);
    // Clear delivery address
    window.localStorage.removeItem('b2b-delivery-address');
    // Clear cart
    window.localStorage.removeItem('vinc-b2b-cart');
    // Clear likes (customer-specific)
    window.localStorage.removeItem('likes-state');
    console.log('[clearAllB2BSessionData] Cleared likes-state');
    // Clear reminders (customer-specific) - uses 'vinc-app-reminders' key
    window.localStorage.removeItem('vinc-app-reminders');
    console.log('[clearAllB2BSessionData] Cleared vinc-app-reminders');
    // Reset the in-memory state by mutating (not replacing)
    Object.assign(ERP_STATIC, {
      id_cart: '0',
      customer_code: '0',
      address_code: '0',
      username: 'guest@example.com',
      company_name: undefined,
      ext_call: true,
      vinc_customer_id: undefined,
      vinc_address_id: undefined,
    });
  } catch {}
}

// Hydrate ERP_STATIC from localStorage on client-side
// This is needed because the module initializes on SSR where localStorage doesn't exist
export function hydrateErpStatic(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const stored = loadState();
    // Valid if we have either legacy ERP customer_code or VINC API customer_id
    const hasValidContext =
      (stored?.customer_code && stored.customer_code !== '0') ||
      stored?.vinc_customer_id;
    if (stored && hasValidContext) {
      // Mutate the existing object instead of replacing
      Object.assign(ERP_STATIC, stored);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Check if ERP_STATIC has valid customer context
export function hasValidErpContext(): boolean {
  // Valid if we have either legacy ERP context or VINC API customer_id
  return Boolean(
    (ERP_STATIC.customer_code &&
      ERP_STATIC.address_code &&
      ERP_STATIC.customer_code !== '0') ||
      ERP_STATIC.vinc_customer_id,
  );
}
