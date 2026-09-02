import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  closeModal: vi.fn(),
  goBack: vi.fn(),
  stack: [{}] as any[],
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
  }),
}));
vi.mock('@components/common/modal/modal.context', () => ({
  useModalState: () => ({ stack: mocks.stack, data: {} }),
  useModalAction: () => ({
    closeModal: mocks.closeModal,
    goBack: mocks.goBack,
  }),
}));

import TimeDrawerShell from '@/components/themes/time/product/time-drawer-shell';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.stack = [{}];
});

describe('TimeDrawerShell', () => {
  it('renders its children', () => {
    render(
      <TimeDrawerShell lang="it" title="Storico">
        <p>contenuto</p>
      </TimeDrawerShell>,
    );
    expect(screen.getByText('contenuto')).toBeTruthy();
  });

  it('shows the panel title in the accent bar', () => {
    render(
      <TimeDrawerShell lang="it" title="Storico ordinato">
        <p>x</p>
      </TimeDrawerShell>,
    );
    expect(screen.getByText('Storico ordinato')).toBeTruthy();
  });

  it('closes the drawer from the close button', () => {
    render(
      <TimeDrawerShell lang="it" title="t">
        <p>x</p>
      </TimeDrawerShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: /chiudi/i }));
    expect(mocks.closeModal).toHaveBeenCalled();
  });

  it('closes the drawer when the back control is used on a single layer', () => {
    render(
      <TimeDrawerShell lang="it" title="t">
        <p>x</p>
      </TimeDrawerShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: /indietro/i }));
    expect(mocks.closeModal).toHaveBeenCalled();
    expect(mocks.goBack).not.toHaveBeenCalled();
  });

  it('returns to the previous layer when the drawer was stacked', () => {
    // Opened from the variants drawer, "torna indietro" must return to the
    // variants list rather than dismissing the whole stack.
    mocks.stack = [{}, {}];
    render(
      <TimeDrawerShell lang="it" title="t">
        <p>x</p>
      </TimeDrawerShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: /indietro/i }));
    expect(mocks.goBack).toHaveBeenCalled();
    expect(mocks.closeModal).not.toHaveBeenCalled();
  });

  it('constrains the content when asked to, instead of filling the drawer', () => {
    const { container } = render(
      <TimeDrawerShell lang="it" title="t" maxContentWidth={900}>
        <p>x</p>
      </TimeDrawerShell>,
    );
    const content = container.querySelector('[data-drawer-content]');
    expect(content).not.toBeNull();
    expect((content as HTMLElement).style.maxWidth).toBe('900px');
  });

  it('keeps capped content aligned to the left edge, not centred', () => {
    // A capped column centred in a fullscreen drawer reads as floating; it
    // should start at the same left margin as every other panel.
    const { container } = render(
      <TimeDrawerShell lang="it" title="t" maxContentWidth={900}>
        <p>x</p>
      </TimeDrawerShell>,
    );
    const content = container.querySelector(
      '[data-drawer-content]',
    ) as HTMLElement;
    expect(content.className).not.toContain('mx-auto');
    expect(content.style.marginLeft).not.toBe('auto');
  });

  it('lets the content span the full drawer by default', () => {
    const { container } = render(
      <TimeDrawerShell lang="it" title="t">
        <p>x</p>
      </TimeDrawerShell>,
    );
    const content = container.querySelector(
      '[data-drawer-content]',
    ) as HTMLElement;
    expect(content.style.maxWidth).toBe('');
  });
});
