import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserSummaryReportPage from '../../src/pages/UserSummaryReportPage.jsx';

vi.mock('../../src/services/reports.api.js', () => ({
  exportUserSummary: vi.fn(),
  exportReport: vi.fn(),
  triggerReminders: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import { exportUserSummary } from '../../src/services/reports.api.js';

describe('UserSummaryReportPage (docs/08-ui-ux.md §9)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    exportUserSummary.mockReset();
  });

  it('renders the heading and an explanation that no live preview is available (real API gap — see Phase 10.6 report §J)', () => {
    render(<UserSummaryReportPage />);
    expect(screen.getByRole('heading', { name: 'User Summary Report' })).toBeInTheDocument();
    expect(screen.getByText('یہاں لائیو پیش منظر دستیاب نہیں — ایکسپورٹ بٹن سے رپورٹ فائل حاصل کریں۔')).toBeInTheDocument();
  });

  it('the column-hide control persists to its own localStorage key, distinct from the dashboard\'s', () => {
    const { unmount } = render(<UserSummaryReportPage />);
    fireEvent.click(screen.getByLabelText('Columns'));
    fireEvent.click(screen.getByLabelText('بند'));
    unmount();

    expect(JSON.parse(window.localStorage.getItem('userSummary.visibleColumns.v1'))).toMatchObject({ closed: false });
    expect(window.localStorage.getItem('dashboard.visibleColumns.v1')).toBeNull();
  });

  it('"Name" is locked (cannot be hidden)', () => {
    render(<UserSummaryReportPage />);
    fireEvent.click(screen.getByLabelText('Columns'));
    expect(screen.getByLabelText('نام')).toBeDisabled();
  });

  it('Export reuses the shared ExportMenu and carries the current column-hide state into the request', async () => {
    exportUserSummary.mockResolvedValue(new Blob(['x']));
    render(<UserSummaryReportPage />);

    // Hide "Closed" before exporting.
    fireEvent.click(screen.getByLabelText('Columns'));
    fireEvent.click(screen.getByLabelText('بند'));

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(exportUserSummary).toHaveBeenCalled());
    const params = exportUserSummary.mock.calls[0][0];
    expect(params.format).toBe('excel');
    expect(params.columns.split(',')).not.toContain('closed');
    expect(params.columns.split(',')).toContain('name');
  });
});
