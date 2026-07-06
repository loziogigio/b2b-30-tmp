import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the modules fetchPimFilters depends on at the network edge.
// ERP_STATIC is mutable so each test can set the logged-in customer context.
// ---------------------------------------------------------------------------

vi.mock('@framework/utils/httpPIM', () => ({
  post: vi.fn(),
}));

vi.mock('@/app/i18n/settings', () => ({
  resolveSupportedLang: (_lang: unknown) => 'it',
}));

const erpStatic = vi.hoisted(() => ({
  customer_code: '',
  address_code: '',
}));
vi.mock('@framework/utils/static', () => ({
  ERP_STATIC: erpStatic,
}));

// ---------------------------------------------------------------------------
// Imports — must come AFTER vi.mock() calls so the mocks are installed first.
// ---------------------------------------------------------------------------
import { post } from '@framework/utils/httpPIM';
import { fetchPimFilters } from '@framework/product/get-pim-filters';

const okResponse = {
  success: true,
  data: { results: [], numFound: 0, facet_results: {} },
};

// The facet fetch must carry the SAME channel + customer context as the
// product search, so the BE applies the channel-scoped user-attribute
// exclusion rules (catalog_settings.user_exclusion_rules) to facet counts too.
// Without them the sidebar would count products the customer can never see.
describe('fetchPimFilters — channel + customer context for user exclusions', () => {
  const mockPost = post as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue(okResponse);
    erpStatic.customer_code = '';
    erpStatic.address_code = '';
  });

  it('always sends the b2b channel by default', async () => {
    await fetchPimFilters({ lang: 'it' });

    expect(mockPost).toHaveBeenCalledOnce();
    const [, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject({ channel: 'b2b', include_faceting: true });
  });

  it('sends customer_code and address_code when a customer is selected', async () => {
    erpStatic.customer_code = 'B_10008';
    erpStatic.address_code = '1';

    await fetchPimFilters({ lang: 'it' });

    const [, body] = mockPost.mock.calls[0];
    expect(body).toMatchObject({
      channel: 'b2b',
      customer_code: 'B_10008',
      address_code: '1',
    });
  });

  it('omits customer context for guests (the "0" sentinel is never sent)', async () => {
    erpStatic.customer_code = '0';
    erpStatic.address_code = '0';

    await fetchPimFilters({ lang: 'it' });

    const [, body] = mockPost.mock.calls[0];
    expect(body.customer_code).toBeUndefined();
    expect(body.address_code).toBeUndefined();
    expect(body.channel).toBe('b2b');
  });

  it('respects an explicit channel param over the default', async () => {
    await fetchPimFilters({ lang: 'it', channel: 'b2c' });

    const [, body] = mockPost.mock.calls[0];
    expect(body.channel).toBe('b2c');
  });
});
