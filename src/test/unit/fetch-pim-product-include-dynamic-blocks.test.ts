import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the two modules that fetchPimProductList depends on at the network edge
// ---------------------------------------------------------------------------

// httpPIM.post is what fetchPimProductList calls; intercept it to capture body.
vi.mock('@framework/utils/httpPIM', () => ({
  post: vi.fn(),
}));

// resolveSupportedLang is used to set body.lang; return a stable value.
vi.mock('@/app/i18n/settings', () => ({
  resolveSupportedLang: (_lang: unknown) => 'it',
}));

// ERP_STATIC is read by pimCustomerContext(); return empty so it doesn't add
// customer_code/address_code fields that would complicate body inspection.
vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: { customer_code: '', address_code: '' },
}));

// ---------------------------------------------------------------------------
// Imports — must come AFTER vi.mock() calls so the mocks are installed first.
// ---------------------------------------------------------------------------
import { post } from '@framework/utils/httpPIM';
import { fetchPimProductList } from '@framework/product/get-pim-product';

// ---------------------------------------------------------------------------
// Minimal PIM search response that makes fetchPimProductList resolve cleanly.
// ---------------------------------------------------------------------------
const okResponse = {
  success: true,
  data: { results: [], numFound: 0 },
};

describe('fetchPimProductList — include_dynamic_blocks wiring', () => {
  const mockPost = post as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue(okResponse);
  });

  it('includes include_dynamic_blocks: true in the POST body when the param is set', async () => {
    await fetchPimProductList({
      filters: { sku: ['SKU-001'] },
      include_dynamic_blocks: true,
    });

    expect(mockPost).toHaveBeenCalledOnce();
    const [_url, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject({ include_dynamic_blocks: true });
  });

  it('omits include_dynamic_blocks from the POST body when the param is not set', async () => {
    await fetchPimProductList({
      filters: { sku: ['SKU-002'] },
    });

    expect(mockPost).toHaveBeenCalledOnce();
    const [_url, body] = mockPost.mock.calls[0];
    expect(body).not.toHaveProperty('include_dynamic_blocks');
  });

  it('omits include_dynamic_blocks when the param is explicitly false', async () => {
    await fetchPimProductList({
      filters: { sku: ['SKU-003'] },
      include_dynamic_blocks: false,
    });

    expect(mockPost).toHaveBeenCalledOnce();
    const [_url, body] = mockPost.mock.calls[0];
    expect(body).not.toHaveProperty('include_dynamic_blocks');
  });
});
