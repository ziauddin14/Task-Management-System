import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskTable from '../../../src/components/dashboard/TaskTable.jsx';
import { useColumnVisibility } from '../../../src/hooks/useColumnVisibility.js';
import { COLUMN_DEFINITIONS } from '../../../src/utils/dashboardColumns.js';

const baseTask = {
  id: 't1',
  codeNumber: '260801',
  title: 'A sample task title',
  assignees: [
    { id: 'u1', name: 'Ali' },
    { id: 'u2', name: 'Bilal' },
    { id: 'u3', name: 'Zain' },
  ],
  responsibility: 'IT',
  deadline: '2026-09-01T00:00:00.000Z',
  lastUpdateAt: '2026-08-20T00:00:00.000Z',
  status: 'ongoing',
  timeStatus: { type: 'remaining', days: 5 },
  completionPercent: 40,
  performanceRating: '-',
};

// TaskTable no longer owns its column-visibility state (Phase 10.6 lifted it to DashboardPage.jsx
// so the Export flow can read the same visible-columns set) — this harness wires up the real hook
// exactly as DashboardPage does, so every existing column-toggle/persistence assertion below still
// exercises real behavior unchanged.
function Harness(props) {
  const columnVisibility = useColumnVisibility('dashboard.visibleColumns.v1', COLUMN_DEFINITIONS);
  return <TaskTable columnVisibility={columnVisibility} {...props} />;
}

function renderTable(overrides = {}) {
  const onPageChange = vi.fn();
  const onPageSizeChange = vi.fn();
  const onEdit = vi.fn();
  const onClose = vi.fn();
  const onUpdate = vi.fn();
  const onViewUpdates = vi.fn();
  const onSortChange = vi.fn();
  const utils = render(
    <Harness
      tasks={[baseTask]}
      meta={{ page: 1, totalPages: 3 }}
      isLoading={false}
      isError={false}
      isAdmin={false}
      page={1}
      pageSize={25}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onEdit={onEdit}
      onClose={onClose}
      onUpdate={onUpdate}
      onViewUpdates={onViewUpdates}
      sortBy="deadline"
      sortOrder="asc"
      onSortChange={onSortChange}
      {...overrides}
    />
  );
  return { ...utils, onPageChange, onPageSizeChange, onEdit, onClose, onUpdate, onViewUpdates, onSortChange };
}

describe('TaskTable (docs/08-ui-ux.md §6)', () => {
  beforeEach(() => window.localStorage.clear());

  it('renders the locked columns (Code Number, Kaam, Actions) plus a toggleable column', () => {
    renderTable();
    expect(screen.getByText('260801')).toBeInTheDocument();
    expect(screen.getByText('A sample task title')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
  });

  it('shows an EmptyState when there are no tasks (not a blank table)', () => {
    renderTable({ tasks: [] });
    expect(screen.getByText('Koi kaam is filter se mutabiq nahi mila.')).toBeInTheDocument();
  });

  it('shows a Spinner while loading', () => {
    renderTable({ isLoading: true, tasks: [] });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('caps assignee chips at 2 with a "+N more" indicator', () => {
    renderTable();
    expect(screen.getByText('Ali')).toBeInTheDocument();
    expect(screen.getByText('Bilal')).toBeInTheDocument();
    expect(screen.queryByText('Zain')).not.toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('Update/Previous Updates call their handlers with the task (available to both roles)', () => {
    const { onUpdate, onViewUpdates } = renderTable();
    fireEvent.click(screen.getByText('اپڈیٹ کریں'));
    expect(onUpdate).toHaveBeenCalledWith(baseTask);
    fireEvent.click(screen.getByText('پرانی اپڈیٹس'));
    expect(onViewUpdates).toHaveBeenCalledWith(baseTask);
  });

  it('Update is disabled on an already-closed task; Previous Updates stays enabled', () => {
    renderTable({ tasks: [{ ...baseTask, status: 'closed' }] });
    expect(screen.getByText('اپڈیٹ کریں')).toBeDisabled();
    expect(screen.getByText('پرانی اپڈیٹس')).not.toBeDisabled();
  });

  it('User role: no Edit/Close row actions', () => {
    renderTable({ isAdmin: false });
    expect(screen.queryByText('ترمیم کریں')).not.toBeInTheDocument();
    expect(screen.queryByText('کام بند کریں')).not.toBeInTheDocument();
  });

  it('Admin role: Edit/Close row actions appear and call their handlers', () => {
    const { onEdit, onClose } = renderTable({ isAdmin: true });
    fireEvent.click(screen.getByText('ترمیم کریں'));
    expect(onEdit).toHaveBeenCalledWith(baseTask);
    fireEvent.click(screen.getByText('کام بند کریں'));
    expect(onClose).toHaveBeenCalledWith(baseTask);
  });

  it('Admin role: Edit/Close are disabled for an already-closed task', () => {
    renderTable({ isAdmin: true, tasks: [{ ...baseTask, status: 'closed' }] });
    expect(screen.getByText('ترمیم کریں')).toBeDisabled();
    expect(screen.getByText('کام بند کریں')).toBeDisabled();
  });

  it('column toggle hides a toggleable column, and locked columns have no checkbox to hide them', () => {
    renderTable();
    fireEvent.click(screen.getByLabelText('Columns'));
    const responsibilityCheckbox = screen.getByLabelText('ذمہ داری');
    const codeNumberCheckbox = screen.getByLabelText('کوڈ نمبر');

    expect(codeNumberCheckbox).toBeDisabled();
    expect(responsibilityCheckbox).toBeChecked();

    fireEvent.click(responsibilityCheckbox);
    expect(screen.queryByText('IT')).not.toBeInTheDocument();
  });

  it('column visibility persists to localStorage across remounts (versioned key)', () => {
    const { unmount } = renderTable();
    fireEvent.click(screen.getByLabelText('Columns'));
    fireEvent.click(screen.getByLabelText('ذمہ داری'));
    unmount();

    expect(JSON.parse(window.localStorage.getItem('dashboard.visibleColumns.v1'))).toMatchObject({
      responsibility: false,
    });

    renderTable();
    expect(screen.queryByText('IT')).not.toBeInTheDocument();
  });

  it('pagination forwards page/page-size changes', () => {
    const { onPageChange, onPageSizeChange } = renderTable({ page: 2, meta: { totalPages: 5 } });
    fireEvent.click(screen.getByText('Agay'));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.change(screen.getByLabelText('Har safhe par'), { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  // Prompt 2H — column sorting, confirmed on Deadline and Code Number as requested.
  describe('column sorting', () => {
    it('Deadline: clicking the header while already sorted by it (asc) switches to desc', () => {
      const { onSortChange } = renderTable({ sortBy: 'deadline', sortOrder: 'asc' });
      fireEvent.click(screen.getByText('آخری تاریخ'));
      expect(onSortChange).toHaveBeenCalledWith('deadline', 'desc');
    });

    it('Deadline: clicking again while sorted desc switches back to asc', () => {
      const { onSortChange } = renderTable({ sortBy: 'deadline', sortOrder: 'desc' });
      fireEvent.click(screen.getByText('آخری تاریخ'));
      expect(onSortChange).toHaveBeenCalledWith('deadline', 'asc');
    });

    it('Code Number: clicking a DIFFERENT column than the current sort starts it fresh at asc', () => {
      const { onSortChange } = renderTable({ sortBy: 'deadline', sortOrder: 'desc' });
      fireEvent.click(screen.getByText('کوڈ نمبر'));
      expect(onSortChange).toHaveBeenCalledWith('codeNumber', 'asc');
    });

    it('a non-sortable column (Zimmedar/assignees) has no sort button and does not call onSortChange', () => {
      const { onSortChange } = renderTable();
      // "ذمہ دار" is a plain header, not a button — no click handler exists to fire.
      expect(screen.getByText('ذمہ دار').closest('button')).toBeNull();
      expect(onSortChange).not.toHaveBeenCalled();
    });
  });
});
