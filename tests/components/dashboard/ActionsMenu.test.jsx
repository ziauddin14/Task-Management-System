import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionsMenu from '../../../src/components/dashboard/ActionsMenu.jsx';

const sampleFile = new File(['x'], 'report.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

const SAMPLE_COLUMNS = [
  { key: 'codeNumber', label: 'کوڈ نمبر', locked: true },
  { key: 'assignees', label: 'ذمہ دار', locked: false },
];

// Prompt — TMS Dashboard header cleanup: one "ایکشن" trigger holding کالمز (column visibility) +
// Export (and, nested inside it, WhatsApp Share) — reusing the existing ColumnToggle/ExportMenu/
// WhatsAppShareButton components and handlers unchanged; no standalone Columns button exists
// anywhere else on the page. columns/isColumnVisible/onToggleColumn are optional — a caller that
// omits them (none today) just doesn't get a کالمز item, which the first test below covers.
describe('ActionsMenu', () => {
  it('hides its dropdown until the "ایکشن" trigger is clicked', () => {
    render(<ActionsMenu onExport={vi.fn()} isLoading={false} />);
    expect(screen.queryByText('ایکسپورٹ کریں')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ایکشن' }));
    expect(screen.getByText('ایکسپورٹ کریں')).toBeInTheDocument();
    // No columns prop passed — no کالمز item at all, not even hidden.
    expect(screen.queryByText('کالمز')).not.toBeInTheDocument();
  });

  it('shows "کالمز" as the first item when column-visibility props are supplied, and toggling a checkbox calls the existing handler', () => {
    const onToggleColumn = vi.fn();
    render(
      <ActionsMenu
        onExport={vi.fn()}
        isLoading={false}
        columns={SAMPLE_COLUMNS}
        isColumnVisible={(key) => key !== 'assignees'}
        onToggleColumn={onToggleColumn}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'ایکشن' }));
    fireEvent.click(screen.getByText('کالمز'));

    const assigneesCheckbox = screen.getByText('ذمہ دار').previousSibling;
    expect(assigneesCheckbox).not.toBeChecked();
    fireEvent.click(assigneesCheckbox);
    expect(onToggleColumn).toHaveBeenCalledWith('assignees');

    // Locked columns stay disabled, matching the existing ColumnToggle behavior unchanged.
    const codeNumberCheckbox = screen.getByText('کوڈ نمبر').previousSibling;
    expect(codeNumberCheckbox).toBeDisabled();
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

    // floating-ui's useDismiss listens for 'pointerdown' by default, not 'mousedown'.
    fireEvent.pointerDown(screen.getByText('outside'));
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
