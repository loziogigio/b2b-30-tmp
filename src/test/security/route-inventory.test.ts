import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Every browser-facing route requires a security review, including wrappers
// which hide their service credentials behind an imported helper.
const reviewedRoutes = [
  'admin/clear-tenant-cache/route.ts',
  'auth/activity/route.ts',
  'auth/callback/route.ts',
  'auth/change-password/route.ts',
  'auth/login/route.ts',
  'auth/logout/route.ts',
  'auth/refresh/route.ts',
  'auth/registration-request/route.ts',
  'auth/reset-password/route.ts',
  'auth/validate/route.ts',
  'b2b/account-settings/route.ts',
  'b2b/addresses/route.ts',
  'b2b/barcodes/route.ts',
  'b2b/cart-closure/route.ts',
  'b2b/cart-settings/route.ts',
  'b2b/cart/delete/route.ts',
  'b2b/cart/remove-items/route.ts',
  'b2b/catalog-settings/route.ts',
  'b2b/customer/route.ts',
  'b2b/home-settings/route.ts',
  'b2b/languages/route.ts',
  'b2b/product-search/route.ts',
  'erp/[...path]/route.ts',
  'erp/invoice-pdf/route.ts',
  'forms/submit/route.ts',
  'newsletter/subscribe/route.ts',
  'pages/[slug]/publish/route.ts',
  'pages/[slug]/resolve/route.ts',
  'profile/[model]/[id]/route.ts',
  'profile/[model]/route.ts',
  'profile/document/[model]/[id]/route.ts',
  'proxy/b2b/[...path]/route.ts',
  'proxy/pim/[...path]/route.ts',
  'radio/[id]/route.ts',
  'revalidate/route.ts',
];
const apiRoot = fileURLToPath(new URL('../../app/api', import.meta.url));
function routes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? routes(path.join(dir, entry.name))
      : entry.name === 'route.ts'
        ? [path.relative(apiRoot, path.join(dir, entry.name))]
        : [],
  );
}
describe('browser route security inventory', () => {
  it('requires an explicit review for each new browser-facing route', () => {
    expect(routes(apiRoot).sort()).toEqual(reviewedRoutes);
  });
  it.each([
    [
      'proxy/pim/[...path]/route.ts',
      'storefrontProxyAccess',
      'resolveStorefrontSession',
    ],
    ['proxy/b2b/[...path]/route.ts', 'legacyReads', 'scopedErpRequest'],
    ['erp/[...path]/route.ts', 'ERP_READ_ENDPOINTS', 'sessionCustomerContext'],
    [
      'b2b/customer/route.ts',
      'sessionOwnsCustomer',
      'resolveStorefrontSession',
    ],
    [
      'b2b/cart-closure/route.ts',
      'shipping_address_code',
      'sessionCustomerContext',
    ],
    ['b2b/addresses/route.ts', 'allowedAddressCodes', 'sessionCustomerContext'],
    ['b2b/cart/delete/route.ts', 'deleteOrder', 'privateStorefrontRoute'],
    ['b2b/cart/remove-items/route.ts', 'deleteOrder', 'privateStorefrontRoute'],
    [
      'profile/[model]/route.ts',
      'resolveStorefrontSession',
      'profileCustomer',
      'sessionOwnsProfileRecord',
      'privateStorefrontRoute',
    ],
    [
      'profile/[model]/[id]/route.ts',
      'resolveStorefrontSession',
      'sessionOwnsProfileRecord',
      'privateStorefrontRoute',
    ],
    [
      'profile/document/[model]/[id]/route.ts',
      'resolveStorefrontSession',
      'sessionOwnsProfileRecord',
      'privateStorefrontRoute',
    ],
  ])('keeps %s connected to its authorization boundary', (file, ...guards) => {
    const code = readFileSync(path.join(apiRoot, file), 'utf8');
    for (const guard of guards) expect(code).toContain(guard);
  });
});
