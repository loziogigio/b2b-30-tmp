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
  return <style dangerouslySetInnerHTML={{ __html: trimmed }} />;
}

export function CustomScripts({
  scripts,
  placement,
}: {
  scripts: CustomScript[] | undefined;
  placement: ScriptPlacement;
}) {
  const selected = selectScriptsForPlacement(scripts, placement);
  if (selected.length === 0) return null;

  return (
    <>
      {selected.map((s, i) => {
        const hasExternal =
          typeof s.src === 'string' && s.src.startsWith('https://');
        const inline = s.inlineCode?.trim();
        return (
          <React.Fragment key={`${placement}-${i}-${s.label}`}>
            {hasExternal && (
              <script
                src={s.src}
                async={s.loadingStrategy === 'async'}
                defer={s.loadingStrategy === 'defer'}
              />
            )}
            {inline && <script dangerouslySetInnerHTML={{ __html: inline }} />}
          </React.Fragment>
        );
      })}
    </>
  );
}
