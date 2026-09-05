/**
 * Root-level files that browsers and crawlers request without a locale prefix.
 *
 * Only what `public/` actually ships passes through untouched. The old
 * `pathname.includes('icon')` bypass also let real storefront URLs such as
 * `/products/silicone-tube` skip locale and tenant handling, and let every
 * missing Apple touch-icon variant render a full storefront page.
 */
const ROOT_STATIC_FILES = new Set([
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png',
  '/manifest.json',
]);

/** PWA / manifest icons shipped under `public/icons/`. */
const ICON_DIRECTORY = '/icons/';

/** Root icon names browsers probe for: sized Apple, Android and Windows variants. */
const ROOT_ICON_PROBE =
  /^\/(?:apple-touch-icon|favicon|android-chrome|mstile)[^/]*\.(?:png|ico|svg|jpe?g|webp)$/i;

export function isRootStaticAsset(pathname: string): boolean {
  if (ROOT_STATIC_FILES.has(pathname)) return true;
  return (
    pathname.startsWith(ICON_DIRECTORY) &&
    pathname.length > ICON_DIRECTORY.length
  );
}

/** A root icon probe for a file we do not ship: answer it cheaply, never render. */
export function isUnservedIconProbe(pathname: string): boolean {
  return !isRootStaticAsset(pathname) && ROOT_ICON_PROBE.test(pathname);
}
