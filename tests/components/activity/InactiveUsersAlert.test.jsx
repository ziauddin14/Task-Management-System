import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InactiveUsersAlert from '../../../src/components/activity/InactiveUsersAlert.jsx';

vi.mock('../../../src/services/activity.api.js', () => ({
  getActivitySummary: vi.fn(),
}));

import { getActivitySummary } from '../../../src/services/activity.api.js';

function renderAlert(isAdmin = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InactiveUsersAlert isAdmin={isAdmin} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('InactiveUsersAlert — the dashboard alert', () => {
  beforeEach(() => {
    getActivitySummary.mockReset();
  });

  it('several inactive: the plural sentence plus "دیکھیں", linking to the filtered activity log', async () => {
    getActivitySummary.mockResolvedValue({ inactiveCount: 3, inactivityDays: 7 });
    renderAlert();
    const link = await screen.findByRole('link', { name: /3 صارفین 7 دن سے غیر متحرک ہیں/ });
    expect(link).toHaveTextContent('دیکھیں');
    expect(link).toHaveAttribute('href', '/activity?inactive=1');
  });

  it('one inactive: the singular sentence, with the configured N', async () => {
    getActivitySummary.mockResolvedValue({ inactiveCount: 1, inactivityDays: 14 });
    renderAlert();
    expect(await screen.findByRole('link', { name: /1 صارف 14 دن سے غیر متحرک ہے/ })).toBeInTheDocument();
  });

  it('nobody inactive: nothing at all', async () => {
    getActivitySummary.mockResolvedValue({ inactiveCount: 0, inactivityDays: 7 });
    const { container } = renderAlert();
    await waitFor(() => expect(getActivitySummary).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('the summary fails (or the backend has no activity log yet): hidden, no crash', async () => {
    getActivitySummary.mockRejectedValue(new Error('Not found'));
    const { container } = renderAlert();
    await waitFor(() => expect(getActivitySummary).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it('a normal user: never asks the server and renders nothing', () => {
    getActivitySummary.mockResolvedValue({ inactiveCount: 3, inactivityDays: 7 });
    const { container } = renderAlert(false);
    expect(container).toBeEmptyDOMElement();
    expect(getActivitySummary).not.toHaveBeenCalled();
  });
});
