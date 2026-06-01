/** 'erp' = keep the existing path (time→/api/erp, others→legacy proxy). */
export type AccountSource = 'erp' | 'vinc';
export type PricingSourceHint = 'erp' | 'inline';

export interface SourcePolicy {
  account: AccountSource; // consumed now
  pricing: PricingSourceHint; // documented seam for the future pricing migration
}

// Explicit allow-lists — an unknown theme must NOT silently become 'vinc'.
const VINC_ACCOUNT_THEMES = new Set<string>(['default']);
const INLINE_PRICING_THEMES = new Set<string>(['default']);

export function sourcePolicy(theme: string | undefined): SourcePolicy {
  const t = theme ?? 'default-unknown';
  return {
    account: VINC_ACCOUNT_THEMES.has(t) ? 'vinc' : 'erp',
    pricing: INLINE_PRICING_THEMES.has(t) ? 'inline' : 'erp',
  };
}
