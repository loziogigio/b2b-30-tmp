// Re-export from shared vinc-pim package
export { API_ENDPOINTS_PIM, type PimEndpoint } from 'vinc-pim';

// Legacy export for backwards compatibility
export const PIM_API_BASE_URL = process.env.NEXT_PUBLIC_PIM_API_URL || '';
