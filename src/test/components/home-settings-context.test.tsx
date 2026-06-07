import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import {
  HomeSettingsProvider,
  useHomeSettingsContext,
} from '@/contexts/home-settings.context';

// Probe component that triggers the context refresh().
function RefreshProbe() {
  const ctx = useHomeSettingsContext();
  return (
    <button type="button" onClick={() => void ctx?.refresh()}>
      refresh
    </button>
  );
}

describe('HomeSettingsProvider refresh', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('refreshes home-settings with the current lang as a query param', async () => {
    // initialSettings=null forces the mount effect to call refresh().
    render(
      <HomeSettingsProvider initialSettings={null} lang="de">
        <RefreshProbe />
      </HomeSettingsProvider>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/api/b2b/home-settings');
    expect(calledUrl).toContain('lang=de');
  });

  it('url-encodes the lang query param', async () => {
    render(
      <HomeSettingsProvider initialSettings={null} lang="zh-Hant">
        <RefreshProbe />
      </HomeSettingsProvider>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain(`lang=${encodeURIComponent('zh-Hant')}`);
  });
});
