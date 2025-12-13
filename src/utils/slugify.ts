/**
 * Slugify: lowercase, strip accents, spaces -> -, safe chars only
 * Used for creating URL-safe slugs from category names, labels, etc.
 */
export function slugify(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}
