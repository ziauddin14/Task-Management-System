import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserActivityDialog from '../../../src/components/activity/UserActivityDialog.jsx';

vi.mock('../../../src/services/activity.api.js', () => ({
  getActivitySummary: vi.fn(),
  getActivityUsers: vi.fn(),
  getUserActivityEvents: vi.fn(),
  getUserActivityHistory: vi.fn(),
  getActivitySettings: vi.fn(),
  updateActivitySettings: vi.fn(),
}));

import { getUserActivityEvents, getUserActivityHistory } from '../../../src/services/activity.api.js';

const PERSON = { id: 'u2', name: 'Quiet Qasim', responsibility: 'IT' };
const EVENTS = [
  { id: 'e1', type: 'TASK_UPDATE_CREATED', at: '2026-10-16T19:01:00.000Z', taskCode: '261001', task: null, device: { browser: 'Chrome', os: 'Android', deviceType: 'mobile' } },
  { id: 'e2', type: 'LOGIN', at: '2026-10-16T18:59:00.000Z', taskCode: null, task: null, device: { browser: 'Edge', os: 'Windows', deviceType: 'desktop' } },
];
const pageMeta = (total, limit = 10) => ({ page: 1, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });

function renderDialog(user = PERSON, onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <UserActivityDialog user={user} onClose={onClose} />
    </QueryClientProvider>
  );
  return { onClose };
}
const lastEventParams = () => getUserActivityEvents.mock.calls.at(-1)[1];

describe('UserActivityDialog — one person\'s timeline', () => {
  beforeEach(() => {
    getUserActivityEvents.mockReset().mockResolvedValue({ items: EVENTS, meta: pageMeta(2) });
    getUserActivityHistory.mockReset().mockResolvedValue({ items: [], meta: { ...pageMeta(0), baselineAt: '2026-09-01T00:00:00.000Z' } });
  });

  it('is a redesigned dialog titled "{name} — ایکٹیویٹی", listing the events in Pakistan time with the device', async () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Quiet Qasim — ایکٹیویٹی' });
    expect(dialog).toHaveAttribute('data-modal-variant', 'redesign');

    const list = await within(dialog).findByRole('list');
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('اپڈیٹ درج کی');
    expect(rows[0]).toHaveTextContent('261001');
    expect(rows[0]).toHaveTextContent('17-10-26, 00:01');
    expect(rows[0]).toHaveTextContent('Chrome · Android · موبائل');
    expect(rows[1]).toHaveTextContent('لاگ ان');
    expect(rows[1]).toHaveTextContent('16-10-26, 23:59');
    expect(rows[1]).toHaveTextContent('Edge · Windows · کمپیوٹر');
  });

  it('filters by type and by a from / to date (whole Pakistan days, sent as YYYY-MM-DD), back to page 1', async () => {
    renderDialog();
    await screen.findAllByRole('listitem');
    expect(lastEventParams()).toEqual({ type: undefined, from: undefined, to: undefined, page: 1, limit: 10 });

    const typeSelect = screen.getByRole('combobox', { name: 'تمام ایکٹیویٹیز' });
    expect(within(typeSelect).getAllByRole('option')).toHaveLength(21); // "تمام ایکٹیویٹیز" + 20 types
    fireEvent.change(typeSelect, { target: { value: 'LOGIN' } });
    await waitFor(() => expect(lastEventParams()).toMatchObject({ type: 'LOGIN', page: 1 }));

    fireEvent.change(screen.getByLabelText('از تاریخ'), { target: { value: '2026-10-16' } });
    fireEvent.change(screen.getByLabelText('تا تاریخ'), { target: { value: '2026-10-17' } });
    await waitFor(() => expect(lastEventParams()).toMatchObject({ type: 'LOGIN', from: '2026-10-16', to: '2026-10-17', page: 1 }));
  });

  it('an empty period says so in the approved words', async () => {
    getUserActivityEvents.mockResolvedValue({ items: [], meta: pageMeta(0) });
    renderDialog();
    expect(await screen.findByText('اس مدت میں کوئی ایکٹیویٹی نہیں')).toBeInTheDocument();
  });

  it('a failure is a calm message, never a crash', async () => {
    getUserActivityEvents.mockRejectedValue(new Error('down'));
    renderDialog();
    expect(await screen.findByText('سرگزشت لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔')).toBeInTheDocument();
  });

  it('paginates a long timeline', async () => {
    getUserActivityEvents.mockResolvedValue({ items: EVENTS, meta: { page: 1, limit: 10, total: 23, totalPages: 3 } });
    renderDialog();
    await screen.findAllByRole('listitem');
    fireEvent.click(screen.getByRole('button', { name: 'آگے' }));
    await waitFor(() => expect(lastEventParams()).toMatchObject({ page: 2 }));
  });

  it('the pre-log history section: task code, percent and time only — its own pages; hidden when empty', async () => {
    getUserActivityHistory.mockResolvedValue({
      items: [{ id: 'h1', at: '2026-08-10T04:00:00.000Z', taskCode: '250002', completionPercent: 30 }],
      meta: { page: 1, limit: 10, total: 12, totalPages: 2, baselineAt: '2026-09-01T00:00:00.000Z' },
    });
    renderDialog();
    const section = await screen.findByRole('region', { name: 'ایکٹیویٹی لاگ سے پہلے کی اپڈیٹس' });
    expect(within(section).getByRole('heading', { name: 'ایکٹیویٹی لاگ سے پہلے کی اپڈیٹس' })).toBeInTheDocument();
    const [row] = within(section).getAllByRole('listitem');
    expect(row).toHaveTextContent('250002');
    expect(row).toHaveTextContent('30%');
    expect(row).toHaveTextContent('10-08-26, 09:00');
    expect(getUserActivityHistory).toHaveBeenCalledWith('u2', { page: 1, limit: 10 });

    fireEvent.click(within(section).getByRole('button', { name: 'آگے' }));
    await waitFor(() => expect(getUserActivityHistory).toHaveBeenLastCalledWith('u2', { page: 2, limit: 10 }));
  });

  it('no history section when there is none, or when it cannot be read', async () => {
    renderDialog();
    await screen.findAllByRole('listitem');
    expect(screen.queryByRole('region', { name: 'ایکٹیویٹی لاگ سے پہلے کی اپڈیٹس' })).not.toBeInTheDocument();
  });

  it('closes from its close button', () => {
    const { onClose } = renderDialog();
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'بند کریں' })[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing without a person', () => {
    renderDialog(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getUserActivityEvents).not.toHaveBeenCalled();
  });
});
