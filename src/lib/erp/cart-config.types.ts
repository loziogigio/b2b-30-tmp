/**
 * Client-safe cart UI config types. Kept separate from cart-config.ts (which
 * dynamically imports the tenant/Redis/Mongo server stack) so client components
 * — e.g. use-cart-settings.tsx — can import the shape + defaults without pulling
 * server-only modules into the browser bundle.
 */
export type CartConfig = {
  /** Per-line note input on the cart table. */
  showLineNote: boolean;
  /** Order head note textarea on the checkout summary. */
  showHeadNote: boolean;
  /** "Ritiro" (pickup) delivery option on the checkout summary. */
  showPickup: boolean;
};

/**
 * Both notes hidden by default — matches the previous hardcoded behaviour.
 * Pickup defaults ON: it was always rendered before this flag existed, so an
 * absent `show_pickup` must keep it visible.
 */
export const DEFAULT_CART_CONFIG: CartConfig = {
  showLineNote: false,
  showHeadNote: false,
  showPickup: true,
};
