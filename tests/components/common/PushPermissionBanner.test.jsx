import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PushPermissionBanner from '../../../src/components/common/PushPermissionBanner.jsx';

vi.mock('../../../src/utils/pushNotifications.js', () => ({
  isPushSupported: vi.fn(),
  getExistingSubscription: vi.fn(),
}));

const mockMutate = vi.fn();
vi.mock('../../../src/hooks/useSubscribeToPush.js', () => ({
  useSubscribeToPush: () => ({ mutate: mockMutate, isPending: false }),
}));

import { isPushSupported, getExistingSubscription } from '../../../src/utils/pushNotifications.js';

const STORAGE_KEY = 'pushPermissionBanner.dismissed.v1';

describe('PushPermissionBanner', () => {
  beforeEach(() => {
    isPushSupported.mockReset();
    getExistingSubscription.mockReset();
    mockMutate.mockReset();
    window.localStorage.clear();
    vi.stubGlobal('Notification', { permission: 'default' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing when push is not supported', async () => {
    isPushSupported.mockReturnValue(false);
    const { container } = render(<PushPermissionBanner />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when permission has already been decided (not "default")', async () => {
    isPushSupported.mockReturnValue(true);
    vi.stubGlobal('Notification', { permission: 'granted' });
    const { container } = render(<PushPermissionBanner />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when a subscription already exists', async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue({ endpoint: 'https://x.test' });
    const { container } = render(<PushPermissionBanner />);

    await waitFor(() => expect(getExistingSubscription).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the banner when eligible: supported, permission default, no existing subscription', async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue(null);
    render(<PushPermissionBanner />);

    expect(await screen.findByText('فون/کمپیوٹر کی نوٹیفیکیشن ٹرے میں بھی اطلاعات پانا چاہیں؟')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'فعال کریں' })).toBeInTheDocument();
  });

  it('clicking "فعال کریں" triggers the subscribe mutation and dismisses the banner', async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue(null);
    mockMutate.mockImplementation((_, { onSettled }) => onSettled());
    render(<PushPermissionBanner />);

    fireEvent.click(await screen.findByRole('button', { name: 'فعال کریں' }));

    expect(mockMutate).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText('فون/کمپیوٹر کی نوٹیفیکیشن ٹرے میں بھی اطلاعات پانا چاہیں؟')).not.toBeInTheDocument()
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('clicking the dismiss (X) button hides the banner and remembers the dismissal', async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue(null);
    render(<PushPermissionBanner />);

    fireEvent.click(await screen.findByRole('button', { name: 'بند کریں' }));

    expect(screen.queryByText('فون/کمپیوٹر کی نوٹیفیکیشن ٹرے میں بھی اطلاعات پانا چاہیں؟')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('never shows again once already dismissed, even if otherwise eligible', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue(null);
    const { container } = render(<PushPermissionBanner />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container).toBeEmptyDOMElement();
  });
});
