import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CustomScripts } from '@/components/common/custom-scripts';

// 'defer', not 'async': React 19 hoists async external scripts as resources,
// which would make static-markup assertions depend on hoisting behaviour.
const base = {
  placement: 'head' as const,
  loadingStrategy: 'defer' as const,
  enabled: true,
};

describe('CustomScripts data access attributes', () => {
  it('marks only scripts with data access and attaches their token', () => {
    const html = renderToStaticMarkup(
      <CustomScripts
        placement="head"
        tokens={{ scr_aaaaaaaaaaaa: 'aaa.bbb.ccc' }}
        scripts={[
          {
            ...base,
            label: 'Preventivatore',
            inlineCode: 'run()',
            scriptId: 'scr_aaaaaaaaaaaa',
            hasDataAccess: true,
          },
          {
            ...base,
            label: 'Analytics',
            src: 'https://x.test/a.js',
            scriptId: 'scr_bbbbbbbbbbbb',
          },
        ]}
      />,
    );
    expect(html).toContain('data-vinc-script="scr_aaaaaaaaaaaa"');
    expect(html).toContain('data-vinc-token="aaa.bbb.ccc"');
    expect(html).not.toContain('scr_bbbbbbbbbbbb');
  });
  it('marks guests without a token, and marks both tags of a src + inline script', () => {
    const html = renderToStaticMarkup(
      <CustomScripts
        placement="head"
        scripts={[
          {
            ...base,
            label: 'P',
            src: 'https://cdn.test/w.js',
            inlineCode: 'run()',
            scriptId: 'scr_aaaaaaaaaaaa',
            hasDataAccess: true,
          },
        ]}
      />,
    );
    expect(html.match(/data-vinc-script="scr_aaaaaaaaaaaa"/g)).toHaveLength(2);
    expect(html).not.toContain('data-vinc-token');
  });
});
