/**
 * Client-safe catalog UI config types. Kept separate from catalog-config.ts
 * (which dynamically imports the tenant/Redis/Mongo server stack) so client
 * components — e.g. use-catalog-settings.tsx — can import the shape + defaults
 * without pulling server-only modules into the browser bundle.
 *
 * Mirrors cart-config.types.ts.
 */
export type CatalogView = 'grid' | 'list';
export type ProductOpenMode = 'modal' | 'detail_page';
export type AvailabilityDisplay = 'in_out' | 'exact';

export type CatalogConfig = {
  /** Initial catalog/search layout when the user hasn't chosen one. */
  defaultView: CatalogView;
  /**
   * What a single/simple product click does. `modal` opens the PRODUCT_VIEW
   * quick view; `detail_page` navigates to /{lang}/products/{sku}. Multi-variant
   * products always open the variants quick-view modal regardless.
   */
  productOpenMode: ProductOpenMode;
  /**
   * How the time theme renders stock. `in_out` shows only the
   * Disponibile/Non disponibile pill; `exact` appends the real stock quantity
   * with its dynamic UOM ("Disponibile · 47 PA").
   */
  availabilityDisplay: AvailabilityDisplay;
};

/**
 * Matches the previous hardcoded behaviour: grid layout, modal quick-view,
 * binary in/out availability.
 */
export const DEFAULT_CATALOG_CONFIG: CatalogConfig = {
  defaultView: 'grid',
  productOpenMode: 'modal',
  availabilityDisplay: 'in_out',
};

/** Coerce an unknown value to a CatalogView, falling back to the default. */
export function asCatalogView(v: unknown): CatalogView {
  return v === 'list' ? 'list' : 'grid';
}

/** Coerce an unknown value to a ProductOpenMode, falling back to the default. */
export function asProductOpenMode(v: unknown): ProductOpenMode {
  return v === 'detail_page' ? 'detail_page' : 'modal';
}

/** Coerce an unknown value to an AvailabilityDisplay, falling back to the default. */
export function asAvailabilityDisplay(v: unknown): AvailabilityDisplay {
  return v === 'exact' ? 'exact' : 'in_out';
}
