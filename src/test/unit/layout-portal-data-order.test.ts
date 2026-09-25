import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Built via fileURLToPath(import.meta.url) + path.join rather than the more
// direct `new URL('../../app', import.meta.url)`: under this project's jsdom
// test environment, Vite's client-side transform special-cases the literal
// `new URL(<literal>, import.meta.url)` pattern into a dev-server asset URL
// (e.g. "http://localhost:3000/src/app"), so fileURLToPath() on it throws
// "The URL must be of scheme file". Resolving the path in two steps avoids
// that syntactic pattern and keeps this test running under the suite's
// default jsdom environment alongside the rest of src/test/unit.
const layout = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../app',
    '[lang]',
    'layout.tsx',
  ),
  'utf8',
);

describe('root layout wiring', () => {
  it('renders the vinc.data helper before the head custom scripts, and passes tokens to both placements', () => {
    const helper = layout.indexOf('<PortalDataSdk');
    expect(helper).toBeGreaterThan(-1);
    expect(helper).toBeLessThan(layout.indexOf('<CustomScripts'));
    expect(layout.match(/tokens=\{scriptTokens\}/g)).toHaveLength(2);
  });
});
