import { describe, expect, it } from 'vitest';
import { isObviousExploitProbe } from '@/lib/security/probe-path';

describe('isObviousExploitProbe', () => {
  it.each([
    '/.env',
    '/it/.env.production',
    '/deploy/%2eenv',
    '/deploy/%252eenv.local',
    '/.git/config',
    '/it/wp-login.php',
    '/it/phpinfo.php',
    '/it/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php',
    '/server-status',
  ])('rejects known scanner path %s', (pathname) => {
    expect(isObviousExploitProbe(pathname)).toBe(true);
  });

  it.each([
    '/',
    '/it/search',
    '/it/radio-player.html',
    '/it/categorie/environment',
    '/it/products/php-tools',
    '/.well-known/acme-challenge/token',
  ])('allows storefront path %s', (pathname) => {
    expect(isObviousExploitProbe(pathname)).toBe(false);
  });
});
