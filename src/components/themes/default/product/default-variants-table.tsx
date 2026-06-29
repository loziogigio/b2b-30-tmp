'use client';

/**
 * Placeholder for the default theme. The grid/list toggle is gated to the
 * time theme, so this never renders today; it exists so the `VariantsTable`
 * registry slot is satisfied for every theme. Replace with a real base-theme
 * extraction when/if the default theme gains the list view.
 */
export default function DefaultVariantsTable() {
  return null;
}
