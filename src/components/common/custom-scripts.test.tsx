import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CustomScripts,
  CustomStyles,
  selectScriptsForPlacement,
} from '@components/common/custom-scripts';
import type { CustomScript } from '@/lib/home-settings/types';

const SCRIPTS: CustomScript[] = [
  {
    label: 'GA',
    src: 'https://www.googletagmanager.com/gtag/js?id=G-X',
    inlineCode: "gtag('config','G-X')",
    placement: 'head',
    loadingStrategy: 'async',
    enabled: true,
  },
  {
    label: 'Chat',
    inlineCode: 'loadChat()',
    placement: 'body_end',
    loadingStrategy: 'async',
    enabled: true,
  },
  {
    label: 'Disabled',
    src: 'https://cdn/off.js',
    placement: 'head',
    loadingStrategy: 'async',
    enabled: false,
  },
];

describe('selectScriptsForPlacement', () => {
  it('keeps only enabled scripts for the placement', () => {
    expect(
      selectScriptsForPlacement(SCRIPTS, 'head').map((s) => s.label),
    ).toEqual(['GA']);
    expect(
      selectScriptsForPlacement(SCRIPTS, 'body_end').map((s) => s.label),
    ).toEqual(['Chat']);
  });

  it('treats missing placement as head', () => {
    const s = [
      { ...SCRIPTS[1], placement: undefined as any, label: 'NoPlace' },
    ];
    expect(selectScriptsForPlacement(s, 'head').map((x) => x.label)).toEqual([
      'NoPlace',
    ]);
  });

  it('returns [] for undefined input', () => {
    expect(selectScriptsForPlacement(undefined, 'head')).toEqual([]);
  });
});

describe('CustomScripts', () => {
  it('emits external (async) + inline tags for head', () => {
    const html = renderToStaticMarkup(
      <CustomScripts scripts={SCRIPTS} placement="head" />,
    );
    expect(html).toContain(
      '<script src="https://www.googletagmanager.com/gtag/js?id=G-X" async=""></script>',
    );
    // dangerouslySetInnerHTML injects raw, unescaped JS (the whole point)
    expect(html).toContain("<script>gtag('config','G-X')</script>");
    // The disabled head script must not appear
    expect(html).not.toContain('off.js');
  });

  it('uses defer attribute for defer strategy and renders body_end inline', () => {
    const html = renderToStaticMarkup(
      <CustomScripts
        scripts={[
          {
            label: 'Deferred',
            src: 'https://cdn/d.js',
            placement: 'head',
            loadingStrategy: 'defer',
            enabled: true,
          },
        ]}
        placement="head"
      />,
    );
    expect(html).toContain('<script src="https://cdn/d.js" defer=""></script>');

    const body = renderToStaticMarkup(
      <CustomScripts scripts={SCRIPTS} placement="body_end" />,
    );
    expect(body).toBe('<script>loadChat()</script>');
  });

  it('renders nothing when no scripts match', () => {
    expect(
      renderToStaticMarkup(<CustomScripts scripts={[]} placement="head" />),
    ).toBe('');
  });
});

describe('CustomStyles', () => {
  it('emits a raw <style> block for non-empty CSS', () => {
    const html = renderToStaticMarkup(
      <CustomStyles css=".cookie-bar{display:none}" />,
    );
    // React 19 may add stylesheet precedence metadata during server rendering;
    // the custom CSS still has to remain raw inside one style element.
    expect(html).toMatch(
      /^<style(?: [^>]*)?>\.cookie-bar\{display:none\}<\/style>$/,
    );
  });

  it('renders nothing for empty/whitespace/undefined CSS', () => {
    expect(renderToStaticMarkup(<CustomStyles css="   " />)).toBe('');
    expect(renderToStaticMarkup(<CustomStyles css={undefined} />)).toBe('');
  });
});
