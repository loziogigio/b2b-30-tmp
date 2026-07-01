/**
 * Client-safe cart UI config types. Kept separate from cart-config.ts (which
 * dynamically imports the tenant/Redis/Mongo server stack) so client components
 * — e.g. use-cart-settings.tsx — can import the shape + defaults without pulling
 * server-only modules into the browser bundle.
 */
/** One per-language mapping to a CMS page slug for the order-success redirect. */
export type OrderSuccessPage = {
  lang: string;
  slug: string;
};

export type CartConfig = {
  /** Per-line note input on the cart table. */
  showLineNote: boolean;
  /** Order head note textarea on the checkout summary. */
  showHeadNote: boolean;
  /** "Ritiro" (pickup) delivery option on the checkout summary. */
  showPickup: boolean;
  /**
   * Per-language CMS page the storefront redirects to after a *plain* (sync)
   * order submit, instead of the built-in `/complete-order` page. Empty ⇒ keep
   * the native page. The async ERP-processing path always keeps `/complete-order`.
   */
  orderSuccessPages: OrderSuccessPage[];
};

/**
 * Both notes hidden by default — matches the previous hardcoded behaviour.
 * Pickup defaults ON: it was always rendered before this flag existed, so an
 * absent `show_pickup` must keep it visible. No success redirect by default.
 */
export const DEFAULT_CART_CONFIG: CartConfig = {
  showLineNote: false,
  showHeadNote: false,
  showPickup: true,
  orderSuccessPages: [],
};

/**
 * Coerce a loose record/JSON value to a clean `OrderSuccessPage[]`. Keeps only
 * entries with a non-empty string `lang` and `slug` (trimmed, lang lowercased).
 */
export function asOrderSuccessPages(v: unknown): OrderSuccessPage[] {
  if (!Array.isArray(v)) return [];
  const out: OrderSuccessPage[] = [];
  for (const entry of v) {
    const lang = String((entry as any)?.lang ?? '')
      .trim()
      .toLowerCase();
    const slug = String((entry as any)?.slug ?? '').trim();
    if (lang && slug) out.push({ lang, slug });
  }
  return out;
}

/**
 * Resolve the success-page slug for a language. Returns the slug configured for
 * `lang`, or undefined when none is set (caller then keeps the native page).
 */
export function resolveOrderSuccessSlug(
  lang: string,
  pages: OrderSuccessPage[] | undefined,
): string | undefined {
  if (!Array.isArray(pages)) return undefined;
  const want = String(lang ?? '')
    .trim()
    .toLowerCase();
  return pages.find((p) => p.lang === want)?.slug || undefined;
}
