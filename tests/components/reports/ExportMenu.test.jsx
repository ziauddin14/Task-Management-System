import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExportMenu from '../../../src/components/reports/ExportMenu.jsx';

const sampleFile = new File(['x'], 'report.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

function clearNavigatorShare() {
  delete window.navigator.canShare;
  delete window.navigator.share;
}

describe('ExportMenu (docs/08-ui-ux.md §10, docs/09-frontend-features.md §8)', () => {
  afterEach(() => clearNavigatorShare());

  it('dashboard mode: confirms with the selected format + reportType', async () => {
    const onExport = vi.fn().mockResolvedValue(sampleFile);
    render(<ExportMenu mode="dashboard" onExport={onExport} isLoading={false} />);

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    fireEvent.change(screen.getByLabelText('Format', { selector: 'select' }), { target: { value: 'pdf' } });
    fireEvent.change(screen.getByLabelText('Report Type', { selector: 'select' }), { target: { value: 'detailed' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(onExport).toHaveBeenCalledWith('pdf', 'detailed'));
  });

  it('userSummary mode: no report-type picker; confirms with reportType undefined', async () => {
    const onExport = vi.fn().mockResolvedValue(sampleFile);
    render(<ExportMenu mode="userSummary" onExport={onExport} isLoading={false} />);

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    expect(screen.queryByText('Report Type')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(onExport).toHaveBeenCalledWith('excel', undefined));
  });

  it('shows a loading/disabled state during generation', () => {
    render(<ExportMenu mode="dashboard" onExport={vi.fn()} isLoading />);
    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));

    const confirmButton = screen.getByText('تیار ہو رہا ہے۔۔۔');
    expect(confirmButton).toBeDisabled();
  });

  it('on success, the WhatsApp share affordance appears (fallback hint, since jsdom has no Web Share API)', async () => {
    const onExport = vi.fn().mockResolvedValue(sampleFile);
    render(<ExportMenu mode="dashboard" onExport={onExport} isLoading={false} />);

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(
      await screen.findByText('ڈاؤن لوڈ ہونے والی فائل کو واٹس ایپ ڈیسک ٹاپ/ویب میں خود اٹیچ کر لیں۔')
    ).toBeInTheDocument();
  });

  it('on failure, the menu stays open so the user can retry without re-picking options', async () => {
    const onExport = vi.fn().mockRejectedValue(new Error('Export mumkin nahi hua.'));
    render(<ExportMenu mode="dashboard" onExport={onExport} isLoading={false} />);

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(onExport).toHaveBeenCalled());
    expect(screen.getByText('Confirm')).toBeInTheDocument(); // dropdown is still open
  });
});
