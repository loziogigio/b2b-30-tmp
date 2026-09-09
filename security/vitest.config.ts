import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(__dirname, '..');
const localRequire = createRequire(path.join(root, 'security/package.json'));
export default defineConfig({
  root,
  test: {
    environment: 'node',
    include: ['src/test/security/**/*.test.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
      '@utils': path.join(root, 'src/utils'),
      '@framework': path.join(root, 'src/framework/basic-rest'),
      'next/server': localRequire.resolve('next/server'),
      'vinc-erp': path.join(root, 'src/test/security/erp-stub.ts'),
    },
  },
});
