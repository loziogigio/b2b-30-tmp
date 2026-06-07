import { describe, it, expect, vi, beforeEach } from 'vitest';

const findOneMock = vi.fn();
const getModelMock = vi.fn(async () => ({
  findOne: (...args: any[]) => ({ lean: () => findOneMock(...args) }),
}));

// b2bpage lookup mock: by default returns null (no record) so the lang gate
// is inert for existing tests that don't opt in to language filtering.
const pageRecordMock = vi.fn();
const getPageModelMock = vi.fn(async () => ({
  findOne: (...args: any[]) => ({
    select: () => ({ lean: () => pageRecordMock(...args) }),
  }),
}));

const connectMock = vi.fn(async () => ({ name: 'vinc-test-tenant' }));

vi.mock('@/lib/db/connection', () => ({
  connectToDatabase: () => connectMock(),
  getHomeTemplateModelForDb: (db: string) => getModelMock(db),
  getB2BPageModelForDb: (db: string) => getPageModelMock(db),
}));

import { loadCmsPage } from '@/lib/db/cms-pages';

describe('loadCmsPage', () => {
  beforeEach(() => {
    findOneMock.mockReset();
    pageRecordMock.mockReset();
    getModelMock.mockClear();
    getPageModelMock.mockClear();
    connectMock.mockClear();
    // Default: no b2bpage record (legacy / orphan template behaviour)
    pageRecordMock.mockResolvedValue(null);
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

  // ── Language gate tests ────────────────────────────────────────────────

  it('passes through (no lang gate) when no lang arg is given', async () => {
    findOneMock.mockResolvedValueOnce({ templateId: 'b2b-default-page-faq' });
    const out = await loadCmsPage('faq');
    // b2bpage model should NOT have been consulted
    expect(getPageModelMock).not.toHaveBeenCalled();
    expect(out).not.toBeNull();
  });

  it('returns null when b2bpage has a different lang than requested', async () => {
    pageRecordMock.mockResolvedValueOnce({ lang: 'de' });
    const out = await loadCmsPage('kontakt', 'it');
    expect(out).toBeNull();
    // Template model should not be consulted at all
    expect(getModelMock).not.toHaveBeenCalled();
  });

  it('proceeds to template when b2bpage lang matches', async () => {
    pageRecordMock.mockResolvedValueOnce({ lang: 'it' });
    const doc = { templateId: 'b2b-default-page-contatti', status: 'published', blocks: [] };
    findOneMock.mockResolvedValueOnce(doc);
    const out = await loadCmsPage('contatti', 'it');
    expect(out).toEqual(doc);
  });

  it('proceeds to template when b2bpage has no lang field (unset)', async () => {
    pageRecordMock.mockResolvedValueOnce({ lang: undefined });
    const doc = { templateId: 'b2b-default-page-faq', status: 'published', blocks: [] };
    findOneMock.mockResolvedValueOnce(doc);
    const out = await loadCmsPage('faq', 'it');
    expect(out).toEqual(doc);
  });

  it('proceeds to template when no b2bpage record exists at all (orphan template)', async () => {
    // pageRecordMock already returns null (from beforeEach)
    const doc = { templateId: 'b2b-default-page-legacy', status: 'published', blocks: [] };
    findOneMock.mockResolvedValueOnce(doc);
    const out = await loadCmsPage('legacy', 'it');
    expect(out).toEqual(doc);
  });
});
