import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionsMenu from '../../../src/components/dashboard/ActionsMenu.jsx';

const sampleFile = new File(['x'], 'report.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

// Prompt — TMS Dashboard header cleanup: replaces the old Print View/Print/Columns controls with
// one "ایکشن" trigger holding exactly Export (and, nested inside it, WhatsApp Share) — reusing
// the existing ExportMenu/WhatsAppShareButton components and handlers unchanged.
describe('ActionsMenu', () => {
  it('hides its dropdown until the "ایکشن" trigger is clicked', () => {
    render(<ActionsMenu onExport={vi.fn()} isLoading={false} />);
    expect(screen.queryByText('ایکسپورٹ کریں')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ایکشن' }));
    expect(screen.getByText('ایکسپورٹ کریں')).toBeInTheDocument();
  });

  it('the Export item calls the existing onExport handler with the selected format', async () => {
    const onExport = vi.fn().mockResolvedValue(sampleFile);
    render(<ActionsMenu onExport={onExport} isLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'ایکشن' }));
    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(onExport).toHaveBeenCalledWith('excel', false));
  });

  it('closes on outside click', () => {
    render(
      <div>
        <ActionsMenu onExport={vi.fn()} isLoading={false} />
        <button type="button">outside</button>
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: 'ایکشن' }));
    expect(screen.getByText('ایکسپورٹ کریں')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText('outside'));
    expect(screen.queryByText('ایکسپورٹ کریں')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<ActionsMenu onExport={vi.fn()} isLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'ایکشن' }));
    expect(screen.getByText('ایکسپورٹ کریں')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('ایکسپورٹ کریں')).not.toBeInTheDocument();
  });
});
