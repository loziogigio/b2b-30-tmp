import { describe, it, expect, vi, beforeEach } from 'vitest';

const findChainMock = vi.fn();
const templateFindMock = vi.fn();
const getPageModelMock = vi.fn(async () => ({
  find: (filter: any) => {
    findChainMock(filter);
    return {
      sort: () => ({
        select: () => ({
          lean: () =>
            Promise.resolve([
              {
                slug: 'faq',
                title: 'FAQ',
                show_in_nav: true,
                sort_order: 0,
                updated_at: new Date('2026-05-11T13:19:10.884Z'),
              },
              {
                slug: 'about',
                title: 'About',
                show_in_nav: true,
                sort_order: 1,
                updated_at: new Date('2026-05-11T13:19:10.884Z'),
              },
              {
                slug: 'draft-only',
                title: 'Draft only',
                show_in_nav: true,
                sort_order: 2,
                updated_at: new Date('2026-05-11T13:19:10.884Z'),
              },
            ]),
        }),
      }),
    };
  },
}));
const connectMock = vi.fn(async () => ({ name: 'vinc-test-tenant' }));

vi.mock('@/lib/db/connection', () => ({
  connectToDatabase: () => connectMock(),
  getHomeTemplateModelForDb: async () => ({
    find: (filter: any) => {
      templateFindMock(filter);
      return {
        select: () => ({
          lean: () =>
            Promise.resolve([
              { templateId: 'b2b-default-page-faq' },
              { templateId: 'b2b-default-page-about' },
            ]),
        }),
      };
    },
  }),
  getB2BPageModelForDb: (db: string) => getPageModelMock(db),
}));

import { loadCmsPageRegistry } from '@/lib/db/cms-pages';

describe('loadCmsPageRegistry', () => {
  beforeEach(() => {
    findChainMock.mockReset();
    templateFindMock.mockReset();
    getPageModelMock.mockClear();
    connectMock.mockClear();
  });

  it('filters by portal_slug=default and status=active', async () => {
    await loadCmsPageRegistry();
    expect(findChainMock).toHaveBeenCalledWith({
      portal_slug: 'default',
      status: 'active',
    });
    expect(getPageModelMock).toHaveBeenCalledWith('vinc-test-tenant');
  });

  it('returns lean entries with only the registry fields', async () => {
    const entries = await loadCmsPageRegistry();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      slug: 'faq',
      title: 'FAQ',
      show_in_nav: true,
      sort_order: 0,
    });
    expect(entries[1].slug).toBe('about');
    expect(entries.some((entry) => entry.slug === 'draft-only')).toBe(false);
    expect(templateFindMock).toHaveBeenCalledWith({
      templateId: {
        $in: [
          'b2b-default-page-faq',
          'b2b-default-page-about',
          'b2b-default-page-draft-only',
        ],
      },
      status: 'published',
    });
  });
});
