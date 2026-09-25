import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '../../src/pages/SettingsPage.jsx';

vi.mock('../../src/utils/pushNotifications.js', () => ({
  isPushSupported: vi.fn(),
}));

const mockStatusQuery = { data: undefined, isLoading: false };
const mockSubscribeMutate = vi.fn();
const mockUnsubscribeMutate = vi.fn();
vi.mock('../../src/hooks/usePushSubscriptionStatus.js', () => ({
  usePushSubscriptionStatus: () => mockStatusQuery,
}));
vi.mock('../../src/hooks/useSubscribeToPush.js', () => ({
  useSubscribeToPush: () => ({ mutate: mockSubscribeMutate, isPending: false }),
}));
vi.mock('../../src/hooks/useUnsubscribeFromPush.js', () => ({
  useUnsubscribeFromPush: () => ({ mutate: mockUnsubscribeMutate, isPending: false }),
}));

import { isPushSupported } from '../../src/utils/pushNotifications.js';

describe('SettingsPage', () => {
  beforeEach(() => {
    isPushSupported.mockReset();
    mockSubscribeMutate.mockReset();
    mockUnsubscribeMutate.mockReset();
    mockStatusQuery.data = undefined;
    mockStatusQuery.isLoading = false;
  });

  it('shows an unsupported message and no toggle when push is not supported', () => {
    isPushSupported.mockReturnValue(false);
    render(<SettingsPage />);

    expect(screen.getByText(/پش نوٹیفیکیشن سپورٹ نہیں کرتا/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /فعال کریں|بند کریں/ })).not.toBeInTheDocument();
  });

  it('shows "فعال کریں" and calls subscribe when not currently subscribed', () => {
    isPushSupported.mockReturnValue(true);
    mockStatusQuery.data = { isSubscribed: false };
    render(<SettingsPage />);

    const button = screen.getByRole('button', { name: /فعال کریں/ });
    fireEvent.click(button);

    expect(mockSubscribeMutate).toHaveBeenCalled();
    expect(mockUnsubscribeMutate).not.toHaveBeenCalled();
  });

  it('shows "بند کریں" and calls unsubscribe when currently subscribed', () => {
    isPushSupported.mockReturnValue(true);
    mockStatusQuery.data = { isSubscribed: true };
    render(<SettingsPage />);

    const button = screen.getByRole('button', { name: /بند کریں/ });
    fireEvent.click(button);

    expect(mockUnsubscribeMutate).toHaveBeenCalled();
    expect(mockSubscribeMutate).not.toHaveBeenCalled();
  });
});
