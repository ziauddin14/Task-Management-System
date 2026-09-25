import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PushPermissionBanner from '../../../src/components/common/PushPermissionBanner.jsx';

vi.mock('../../../src/utils/pushNotifications.js', () => ({
  isPushSupported: vi.fn(),
  getExistingSubscription: vi.fn(),
}));

const mockMutate = vi.fn();
const mockMutationState = { isPending: false, isError: false, error: null, data: undefined };
vi.mock('../../../src/hooks/useSubscribeToPush.js', () => ({
  useSubscribeToPush: () => ({ mutate: mockMutate, ...mockMutationState }),
}));

import { isPushSupported, getExistingSubscription } from '../../../src/utils/pushNotifications.js';

const STORAGE_KEY = 'pushPermissionBanner.dismissed.v1';
const PROMPT_TEXT = 'فون/کمپیوٹر کی نوٹیفیکیشن ٹرے میں بھی اطلاعات پانا چاہیں؟';

describe('PushPermissionBanner', () => {
  beforeEach(() => {
    isPushSupported.mockReset();
    getExistingSubscription.mockReset();
    mockMutate.mockReset();
    mockMutationState.isPending = false;
    mockMutationState.isError = false;
    mockMutationState.error = null;
    mockMutationState.data = undefined;
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

    expect(await screen.findByText(PROMPT_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'فعال کریں' })).toBeInTheDocument();
  });

  it('clicking "فعال کریں" triggers the subscribe mutation, and on genuine success permanently dismisses the banner', async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue(null);
    mockMutate.mockImplementation((_, { onSuccess }) => onSuccess({ granted: true }));
    render(<PushPermissionBanner />);

    fireEvent.click(await screen.findByRole('button', { name: 'فعال کریں' }));

    expect(mockMutate).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText(PROMPT_TEXT)).not.toBeInTheDocument());
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  // Audit fix regression test — this used to dismiss (and permanently remember) on ANY outcome,
  // success or failure alike, via onSettled. That was the production bug: a failed attempt looked
  // identical to success, with zero on-screen trace and no way to ever retry. Split into two
  // checks: (a) the click itself never dismisses on a not-granted result, and (b) once the
  // mutation's own data reflects that result, the retry UI renders it specifically.
  it('does NOT dismiss/remember when permission is not granted (only a genuine granted:true does)', async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue(null);
    mockMutate.mockImplementation((_, { onSuccess }) =>
      onSuccess({ granted: false, reason: 'permission-not-granted', permission: 'denied' })
    );
    render(<PushPermissionBanner />);

    fireEvent.click(await screen.findByRole('button', { name: 'فعال کریں' }));

    expect(mockMutate).toHaveBeenCalled();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull(); // never permanently remembered
  });

  it('renders a specific on-screen reason (not a generic message) once the mutation data reflects "not granted"', async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue(null);
    mockMutationState.data = { granted: false, reason: 'permission-not-granted', permission: 'denied' };
    render(<PushPermissionBanner />);

    expect(await screen.findByText(/اجازت نہیں دی گئی/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'دوبارہ کوشش کریں' })).toBeInTheDocument();
  });

  it("shows the thrown error's own name/message on-screen when the mutation itself fails (not swallowed to console-only)", async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue(null);
    mockMutationState.isError = true;
    mockMutationState.error = Object.assign(new Error('Registration failed - permission denied'), {
      name: 'NotAllowedError',
    });
    render(<PushPermissionBanner />);

    expect(await screen.findByText('NotAllowedError: Registration failed - permission denied')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'دوبارہ کوشش کریں' })).toBeInTheDocument();
  });

  it('clicking "دوبارہ کوشش کریں" (the retry state\'s button) calls the mutation again', async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue(null);
    mockMutationState.isError = true;
    mockMutationState.error = new Error('network error');
    render(<PushPermissionBanner />);

    fireEvent.click(await screen.findByRole('button', { name: 'دوبارہ کوشش کریں' }));

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('clicking the dismiss (X) button hides the banner and remembers the dismissal, even from the retry state', async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue(null);
    mockMutationState.isError = true;
    mockMutationState.error = new Error('network error');
    render(<PushPermissionBanner />);

    fireEvent.click(await screen.findByRole('button', { name: 'بند کریں' }));

    expect(screen.queryByRole('button', { name: 'دوبارہ کوشش کریں' })).not.toBeInTheDocument();
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
