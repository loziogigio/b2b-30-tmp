import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  openModal: vi.fn(),
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
  }),
}));
vi.mock('@components/common/modal/modal.context', () => ({
  useModalAction: () => ({ openModal: mocks.openModal }),
}));

import TimeShelfLabelButton from '@/components/themes/time/product/time-shelf-label-button';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TimeShelfLabelButton', () => {
  it('offers the label for a product that has an EAN', () => {
    render(
      <TimeShelfLabelButton
        lang="it"
        name="SCOLAPOSATE GAIA"
        sku="BF05003"
        ean="8012345678905"
      />,
    );
    expect(
      screen.getByRole('button', { name: /etichetta scaffale/i }),
    ).toBeTruthy();
  });

  it('renders nothing when the product has no EAN', () => {
    const { container } = render(
      <TimeShelfLabelButton
        lang="it"
        name="SCOLAPOSATE GAIA"
        sku="BF05003"
        ean=""
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when the EAN is only whitespace', () => {
    const { container } = render(
      <TimeShelfLabelButton lang="it" name="X" sku="Y" ean="   " />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('opens the shelf-label viewer with the article it was given', () => {
    render(
      <TimeShelfLabelButton
        lang="it"
        name="SCOLAPOSATE GAIA"
        sku="BF05003"
        ean="8012345678905"
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /etichetta scaffale/i }),
    );
    expect(mocks.openModal).toHaveBeenCalledWith('SHELF_LABEL_VIEW', {
      name: 'SCOLAPOSATE GAIA',
      sku: 'BF05003',
      ean: '8012345678905',
    });
  });

  it('sizes itself for the compact popup action row', () => {
    render(
      <TimeShelfLabelButton
        lang="it"
        name="X"
        sku="Y"
        ean="8012345678905"
        size="compact"
      />,
    );
    const button = screen.getByRole('button', { name: /etichetta scaffale/i });
    expect(button.className).toContain('h-[36px]');
  });

  it('sizes itself for the detail-page action row by default', () => {
    render(
      <TimeShelfLabelButton lang="it" name="X" sku="Y" ean="8012345678905" />,
    );
    const button = screen.getByRole('button', { name: /etichetta scaffale/i });
    expect(button.className).toContain('h-[38px]');
  });
});
