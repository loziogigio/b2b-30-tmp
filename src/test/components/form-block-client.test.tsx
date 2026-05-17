import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import FormBlockClient from '@/components/blocks/FormBlockClient';

const baseConfig = {
  variant: 'form' as const,
  title: 'Contact',
  submit_button_text: 'Send',
  success_message: 'Thanks!',
  fields: [
    { id: 'name', type: 'text' as const, label: 'Name', required: true },
    { id: 'email', type: 'email' as const, label: 'Email', required: true },
    { id: 'msg', type: 'textarea' as const, label: 'Message' },
  ],
};

beforeEach(() => fetchMock.mockReset());

describe('FormBlockClient', () => {
  it('renders title and one input per field', () => {
    render(<FormBlockClient config={baseConfig} blockId="b1" pageSlug="faq" />);
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  it('blocks submit when required field empty', async () => {
    const user = userEvent.setup();
    render(<FormBlockClient config={baseConfig} blockId="b1" pageSlug="faq" />);
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to /api/forms/submit on valid submit and shows success_message', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, message: 'Thanks!' }), {
        status: 200,
      }),
    );
    const user = userEvent.setup();
    render(<FormBlockClient config={baseConfig} blockId="b1" pageSlug="faq" />);
    await user.type(screen.getByLabelText('Name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/forms/submit');
    expect(JSON.parse(init.body)).toEqual({
      pageSlug: 'faq',
      formBlockId: 'b1',
      data: { name: 'Alice', email: 'a@b.com', msg: '' },
    });
    expect(await screen.findByText('Thanks!')).toBeInTheDocument();
  });

  it('shows inline error from suite response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Field "Email" is required' }), {
        status: 400,
      }),
    );
    const user = userEvent.setup();
    render(<FormBlockClient config={baseConfig} blockId="b1" pageSlug="faq" />);
    await user.type(screen.getByLabelText('Name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(
      await screen.findByText(/Field "Email" is required/),
    ).toBeInTheDocument();
  });

  it('renders select with options', () => {
    const cfg = {
      ...baseConfig,
      fields: [
        {
          id: 'topic',
          type: 'select' as const,
          label: 'Topic',
          required: true,
          options: [
            { label: 'Sales', value: 'sales' },
            { label: 'Support', value: 'support' },
          ],
        },
      ],
    };
    render(<FormBlockClient config={cfg} blockId="b2" pageSlug="faq" />);
    expect(screen.getByLabelText('Topic')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sales' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Support' })).toBeInTheDocument();
  });

  it('renders checkbox', () => {
    const cfg = {
      ...baseConfig,
      fields: [
        {
          id: 'agree',
          type: 'checkbox' as const,
          label: 'I agree',
        },
      ],
    };
    render(<FormBlockClient config={cfg} blockId="b3" pageSlug="faq" />);
    const checkbox = screen.getByLabelText('I agree');
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });
});
