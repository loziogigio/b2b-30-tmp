// @vitest-environment node
import { describe, expect, it } from 'vitest';
import React, { Suspense } from 'react';
import { Writable } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { useTranslation } from 'src/app/i18n/client';

// Regression for the 2026-09-04 b2b-time outage. A URL whose first segment is
// not a supported language ("/favicon.ico", "/phpinfo", "/wp-json/...") reached
// react-i18next as lng="favicon.ico". With Suspense enabled the hook suspended
// on a resource that can never load, its promise settled immediately, React
// retried, and the render looped forever on the server — one CPU core pinned
// per request until Swarm killed the replica on a failed healthcheck.
const RENDER_BUDGET = 500;

async function renderWithLang(lang: string) {
  let renders = 0;
  function Probe() {
    renders += 1;
    if (renders > RENDER_BUDGET) throw new Error('RENDER_BUDGET_EXCEEDED');
    const { t } = useTranslation(lang, 'common');
    return React.createElement(
      'h1',
      null,
      t('text-page-not-found', { defaultValue: 'fallback' }),
    );
  }
  const chunks: string[] = [];
  const sink = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(String(chunk));
      cb();
    },
  });
  const verdict = await new Promise<string>((resolve) => {
    const timer = setTimeout(() => resolve('TIMEOUT'), 5000);
    const stream = renderToPipeableStream(
      React.createElement(
        Suspense,
        { fallback: null },
        React.createElement(Probe),
      ),
      {
        onAllReady() {
          clearTimeout(timer);
          resolve('COMPLETED');
        },
        onError(err) {
          if (
            String((err as Error)?.message).includes('RENDER_BUDGET_EXCEEDED')
          ) {
            clearTimeout(timer);
            resolve('INFINITE_LOOP');
          }
        },
      },
    );
    stream.pipe(sink);
  });
  return { verdict, renders, html: chunks.join('') };
}

describe('client useTranslation with an unsupported route language', () => {
  it('renders a supported language in a bounded number of passes', async () => {
    const r = await renderWithLang('it');
    expect(r.verdict).toBe('COMPLETED');
    expect(r.renders).toBeLessThanOrEqual(5);
    expect(r.html).toContain('<h1>');
  });

  it.each(['favicon.ico', 'robots.txt', 'phpinfo', 'wp-json'])(
    'does not enter an infinite Suspense render loop for lang=%s',
    async (lang) => {
      const r = await renderWithLang(lang);
      expect(r.verdict).toBe('COMPLETED');
      expect(r.renders).toBeLessThanOrEqual(5);
    },
  );
});
