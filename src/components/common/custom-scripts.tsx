import * as React from 'react';
import type { CustomScript, ScriptPlacement } from '@/lib/home-settings/types';

/**
 * Renders portal-configured third-party scripts (analytics, tag managers,
 * pixels, cookie-consent) into the storefront. Server component — the tags land
 * in the SSR'd HTML and the browser executes them natively on parse.
 *
 * Port of vinc-b2c's `app/layouts/default.vue` script logic. Inline code is
 * admin-authored (trusted), so `dangerouslySetInnerHTML` is acceptable here.
 */

/** Keep only enabled scripts that target the given placement. */
export function selectScriptsForPlacement(
  scripts: CustomScript[] | undefined,
  placement: ScriptPlacement,
): CustomScript[] {
  return (scripts ?? []).filter(
    (s) => s.enabled && (s.placement ?? 'head') === placement,
  );
}

/**
 * Renders portal-configured custom CSS as a single <style> block in <head>.
 * CSS is admin-authored (trusted) and cannot execute JS, so raw injection is safe.
 */
export function CustomStyles({ css }: { css: string | undefined }) {
  const trimmed = css?.trim();
  if (!trimmed) return null;
  return (
    <style href="custom-portal-css" precedence="default">
      {trimmed}
    </style>
  );
}

export function CustomScripts({
  scripts,
  placement,
  tokens,
}: {
  scripts: CustomScript[] | undefined;
  placement: ScriptPlacement;
  /** Per-user vinc.data tokens by scriptId (see lib/portal-data/script-tokens). */
  tokens?: Record<string, string>;
}) {
  const selected = selectScriptsForPlacement(scripts, placement);
  if (selected.length === 0) return null;

  return (
    <>
      {selected.map((s, i) => {
        const hasExternal =
          typeof s.src === 'string' && s.src.startsWith('https://');
        const inline = s.inlineCode?.trim();
        // Only scripts granted data access in CS are marked; vinc.data.connect
        // reads (and removes) the token from the script's own tag.
        const dataAttrs =
          s.hasDataAccess && s.scriptId
            ? {
                'data-vinc-script': s.scriptId,
                ...(tokens?.[s.scriptId]
                  ? { 'data-vinc-token': tokens[s.scriptId] }
                  : {}),
              }
            : {};
        return (
          <React.Fragment key={`${placement}-${i}-${s.label}`}>
            {hasExternal && (
              <script
                src={s.src}
                // A data-access script must run after the inline
                // vinc-portal-data-sdk helper (rendered elsewhere in <head>)
                // has set up window.vinc. React 19 hoists any <script async
                // src> straight into the document head ahead of everything
                // else in the tree, so an async external data script could
                // run before window.vinc exists. `defer` is never hoisted —
                // it preserves document order (runs after parsing, so after
                // the inline helper) and still sets document.currentScript,
                // which vinc.data.connect needs to find its own tag. Force
                // defer, never async, for a data-access script regardless of
                // its configured loadingStrategy; scripts without data
                // access keep their configured strategy exactly.
                async={
                  s.hasDataAccess && s.scriptId
                    ? false
                    : s.loadingStrategy === 'async'
                }
                defer={
                  s.hasDataAccess && s.scriptId
                    ? true
                    : s.loadingStrategy === 'defer'
                }
                {...dataAttrs}
                suppressHydrationWarning
              />
            )}
            {inline && (
              <script
                dangerouslySetInnerHTML={{ __html: inline }}
                {...dataAttrs}
                suppressHydrationWarning
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
