import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from '../../src/pages/SettingsPage.jsx';
import { useAuthStore } from '../../src/store/authStore.js';

vi.mock('../../src/utils/pushNotifications.js', () => ({ isPushSupported: () => true }));
vi.mock('../../src/hooks/usePushSubscriptionStatus.js', () => ({
  usePushSubscriptionStatus: () => ({ data: { isSubscribed: false }, isLoading: false }),
}));
vi.mock('../../src/hooks/useSubscribeToPush.js', () => ({ useSubscribeToPush: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('../../src/hooks/useUnsubscribeFromPush.js', () => ({ useUnsubscribeFromPush: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('../../src/services/activity.api.js', () => ({
  getActivitySettings: vi.fn(),
  updateActivitySettings: vi.fn(),
  getActivitySummary: vi.fn(),
  getActivityUsers: vi.fn(),
}));

import { getActivitySettings, updateActivitySettings } from '../../src/services/activity.api.js';

const SETTINGS = { inactivityDays: 7, baselineAt: '2026-09-01T00:00:00.000Z', minInactivityDays: 1, maxInactivityDays: 90 };
const LABEL = 'غیر متحرک ہونے کی حد (دن)';
const ERROR = '1 سے 90 کے درمیان پورا عدد درج کریں';

function renderPage(role) {
  useAuthStore.setState(role ? { user: { id: 'a1', name: 'Admin', role }, token: 'jwt', isAuthenticated: true } : { user: null, token: null, isAuthenticated: false });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
    </QueryClientProvider>
  );
}

describe('SettingsPage — the activity log card (Admin only)', () => {
  beforeEach(() => {
    getActivitySettings.mockReset().mockResolvedValue(SETTINGS);
    updateActivitySettings.mockReset().mockImplementation(async ({ inactivityDays }) => ({ ...SETTINGS, inactivityDays }));
  });

  it('a normal user sees the page exactly as before: no card, no request', () => {
    renderPage('user');
    expect(screen.queryByText('ایکٹیویٹی لاگ')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(LABEL)).not.toBeInTheDocument();
    expect(getActivitySettings).not.toHaveBeenCalled();
  });

  it('an Admin sees the card with the stored N; Save is enabled only once it changes', async () => {
    renderPage('admin');
    expect(screen.getByRole('heading', { name: 'ایکٹیویٹی لاگ' })).toBeInTheDocument();
    const field = await screen.findByLabelText(LABEL);
    expect(field).toHaveValue(7);
    const save = screen.getByRole('button', { name: 'محفوظ کریں' });
    expect(save).toBeDisabled();
    fireEvent.change(field, { target: { value: '14' } });
    expect(save).toBeEnabled();
  });

  it.each(['0', '91', '7.5', '-1', ''])('rejects %p with the approved message and sends nothing', async (value) => {
    renderPage('admin');
    const field = await screen.findByLabelText(LABEL);
    fireEvent.change(field, { target: { value } });
    fireEvent.submit(field.closest('form'));
    expect(screen.getByRole('alert')).toHaveTextContent(ERROR);
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(updateActivitySettings).not.toHaveBeenCalled();
  });

  it('saves a whole number from 1 to 90 and shows the saved value', async () => {
    renderPage('admin');
    const field = await screen.findByLabelText(LABEL);
    fireEvent.change(field, { target: { value: '14' } });
    fireEvent.click(screen.getByRole('button', { name: 'محفوظ کریں' }));
    await waitFor(() => expect(updateActivitySettings).toHaveBeenCalledWith({ inactivityDays: 14 }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'محفوظ کریں' })).toBeDisabled());
    expect(field).toHaveValue(14);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the busy state while saving', async () => {
    updateActivitySettings.mockReturnValue(new Promise(() => {}));
    renderPage('admin');
    const field = await screen.findByLabelText(LABEL);
    fireEvent.change(field, { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'محفوظ کریں' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'محفوظ کریں' })).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByRole('button', { name: 'محفوظ کریں' })).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument(); // the loading phrase under the row
  });

  it('when the setting cannot be read, the card is left out and the page still works', async () => {
    getActivitySettings.mockRejectedValue(new Error('Not found'));
    renderPage('admin');
    await waitFor(() => expect(getActivitySettings).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'ایکٹیویٹی لاگ' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'ترتیبات' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /فعال کریں/ })).toBeInTheDocument();
  });
});
