/**
 * Returns true when `html` has no visible text content — i.e. empty string,
 * whitespace only, or tag-only markup such as `<p></p>` or `<p><br></p>`.
 *
 * Works on both server and client (no DOM required).
 */
export function isEmptyHtml(html: string | undefined | null): boolean {
  if (!html) return true;
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, '')
    .replace(/\s+/g, '');
  return text.length === 0;
}
