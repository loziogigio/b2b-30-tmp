import { describe, it, expect, vi, beforeEach } from 'vitest';

const findOneMock = vi.fn();
const getModelMock = vi.fn(async () => ({
  findOne: (...args: any[]) => ({ lean: () => findOneMock(...args) }),
}));
const connectMock = vi.fn(async () => ({ name: 'vinc-test-tenant' }));

vi.mock('@/lib/db/connection', () => ({
  connectToDatabase: () => connectMock(),
  getHomeTemplateModelForDb: (db: string) => getModelMock(db),
}));

import { loadCmsPage } from '@/lib/db/cms-pages';

describe('loadCmsPage', () => {
  beforeEach(() => {
    findOneMock.mockReset();
    getModelMock.mockClear();
    connectMock.mockClear();
  });

  it('returns null when no published doc matches', async () => {
    findOneMock.mockResolvedValueOnce(null);
    const out = await loadCmsPage('missing');
    expect(out).toBeNull();
    expect(getModelMock).toHaveBeenCalledWith('vinc-test-tenant');
  });

  it('returns the document on hit', async () => {
    const doc = {
      templateId: 'b2b-default-page-faq',
      status: 'published',
      blocks: [{ id: 'b1', type: 'content-custom-html', config: {} }],
      seo: { title: 'FAQ' },
      version: 1,
    };
    findOneMock.mockResolvedValueOnce(doc);
    const out = await loadCmsPage('faq');
    expect(out).toEqual(doc);
  });

  it('queries by templateId b2b-default-page-{slug} and published status', async () => {
    let captured: any;
    getModelMock.mockResolvedValueOnce({
      findOne: (q: any) => {
        captured = q;
        return { lean: () => Promise.resolve(null) };
      },
    } as any);
    await loadCmsPage('faq');
    expect(captured).toEqual({
      templateId: 'b2b-default-page-faq',
      status: 'published',
    });
  });
});
