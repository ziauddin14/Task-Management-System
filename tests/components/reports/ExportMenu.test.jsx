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

  it('dashboard mode: confirms with the selected format + lastUpdateOnly', async () => {
    const onExport = vi.fn().mockResolvedValue(sampleFile);
    render(<ExportMenu mode="dashboard" onExport={onExport} isLoading={false} />);

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    fireEvent.change(screen.getByLabelText('Format', { selector: 'select' }), { target: { value: 'pdf' } });
    fireEvent.click(screen.getByText('صرف آخری اپڈیٹ'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(onExport).toHaveBeenCalledWith('pdf', true));
  });

  it('dashboard mode: offers Word (.docx) as a format option', async () => {
    render(<ExportMenu mode="dashboard" onExport={vi.fn()} isLoading={false} />);
    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    expect(screen.getByText('Word')).toBeInTheDocument();
  });

  it('userSummary mode: no last-update-only checkbox, no Word format option; confirms with lastUpdateOnly undefined', async () => {
    const onExport = vi.fn().mockResolvedValue(sampleFile);
    render(<ExportMenu mode="userSummary" onExport={onExport} isLoading={false} />);

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    expect(screen.queryByText('صرف آخری اپڈیٹ')).not.toBeInTheDocument();
    expect(screen.queryByText('Word')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(onExport).toHaveBeenCalledWith('excel', undefined));
  });

  // Confirm no longer swaps its own text while busy: it keeps "Confirm", and the busy signal is
  // the shared loading phrase on a line under it (whose screen-reader label carries the old
  // "تیار ہو رہا ہے۔۔۔" wording).
  it('during generation, Confirm keeps its label, is busy + disabled, and the loading phrase shows under it', () => {
    render(<ExportMenu mode="dashboard" onExport={vi.fn()} isLoading />);
    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toBeDisabled();
    expect(confirmButton).toHaveAttribute('aria-busy', 'true');

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('تیار ہو رہا ہے۔۔۔');
    // Under the button, not inside it.
    expect(confirmButton.contains(status)).toBe(false);
    expect(confirmButton.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows no loading phrase while idle', () => {
    render(<ExportMenu mode="dashboard" onExport={vi.fn()} isLoading={false} />);
    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));

    expect(screen.getByRole('button', { name: 'Confirm' })).not.toHaveAttribute('aria-busy');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
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
