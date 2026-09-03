import { languages } from 'src/app/i18n/settings';

/**
 * Resolve a campaign-authored notification destination into a URL that means
 * the same thing from every page.
 *
 * A notification's destination is free text typed into the Suite's campaign
 * form: `campaign-send.service.ts` ships it verbatim as `action_url`
 * (`content.products_url || content.url`), and the convention there is a bare
 * relative path — `search?text=condizionatore`. Handed straight to
 * `router.push`, that resolves against whatever page the reader is on, so one
 * notification lands on `/it/search?…` from the home page and on
 * `/it/account/search?…` — a route that does not exist — from the account area.
 *
 * Absolute and non-http destinations (catalogues, mailto:, tel:) are authored
 * deliberately and pass through untouched; script-bearing ones never navigate.
 */

const SCRIPT_SCHEME = /^(?:javascript|data|vbscript):/i;
/** Anything already carrying its own origin or scheme: leave it alone. */
const ABSOLUTE_DESTINATION = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

export function resolveNotificationUrl(
  url: string | null | undefined,
  lang: string,
): string | null {
  const authored = url?.trim();
  if (!authored) return null;
  if (SCRIPT_SCHEME.test(authored)) return null;
  if (ABSOLUTE_DESTINATION.test(authored)) return authored;

  const pathname = authored.startsWith('/') ? authored : `/${authored}`;

  // Already aimed at a language — including one other than the reader's, which
  // a per-language campaign may legitimately do.
  const [firstSegment] = pathname.slice(1).split(/[/?#]/);
  if (languages.includes(firstSegment)) return pathname;

  return `/${lang}${pathname}`;
}
