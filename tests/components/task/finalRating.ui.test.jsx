import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskTable from '../../../src/components/dashboard/TaskTable.jsx';
import PrintView from '../../../src/components/dashboard/PrintView.jsx';
import QualityHero from '../../../src/components/dashboard/QualityHero.jsx';
import QualityHeroCard from '../../../src/components/mobile/QualityHeroCard.jsx';
import TaskCard from '../../../src/components/mobile/TaskCard.jsx';
import TaskActionSheet from '../../../src/components/mobile/TaskActionSheet.jsx';
import PreviousUpdatesContent from '../../../src/components/task/PreviousUpdatesContent.jsx';
import SyntheticRatingDialog from '../../../src/components/task/SyntheticRatingDialog.jsx';
import { useColumnVisibility } from '../../../src/hooks/useColumnVisibility.js';
import { COLUMN_DEFINITIONS } from '../../../src/utils/dashboardColumns.js';
import { ApiError } from '../../../src/services/apiClient.js';

vi.mock('../../../src/services/users.api.js', () => ({ getUsers: vi.fn().mockResolvedValue({ items: [], meta: {} }) }));
vi.mock('../../../src/services/tasks.api.js', () => ({ getTask: vi.fn(), editSyntheticRating: vi.fn(), removeSyntheticRating: vi.fn(), acknowledgeTask: vi.fn() }));
vi.mock('../../../src/services/taskUpdates.api.js', () => ({
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1, total: 0 } }),
  createTaskUpdate: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { getTask, editSyntheticRating, removeSyntheticRating } from '../../../src/services/tasks.api.js';
import toast from 'react-hot-toast';

// A FINAL rating — an admin changed the estimate, so it is no longer one (the server sends
// isSynthetic: false, isFinal: true): no "تخمینی" badge anywhere, and the edit action stays in the
// menu but disabled, with the approved reason. A still-estimated rating behaves exactly as before.
const FINAL_NOTE = 'یہ درجہ بندی حتمی ہو چکی ہے، اب تبدیل نہیں ہو سکتی۔';
const EDIT_LABEL = 'تخمینی درجہ بندی تبدیل کریں';
const base = {
  id: 't1',
  codeNumber: '260801',
  title: 'A real task',
  assignees: [{ id: 'u1', name: 'Ali' }],
  responsibility: 'IT',
  deadline: '2026-09-01T00:00:00.000Z',
  lastUpdateAt: '2026-08-20T00:00:00.000Z',
  status: 'closed',
  timeStatus: { type: 'early', days: 5 },
  completionPercent: 95,
  performanceRating: 'excellent',
  syntheticRating: null,
};
const estimate = { ...base, id: 't2', codeNumber: '250103', title: 'Still an estimate', completionPercent: 0, performanceRating: 'good', syntheticRating: { isSynthetic: true, isFinal: false, assumedPercent: 80, assignedAt: '2026-10-05T09:20:22.000Z' } };
const final = { ...base, id: 't3', codeNumber: '250126', title: 'Made final', completionPercent: 0, performanceRating: 'excellent', syntheticRating: { isSynthetic: false, isFinal: true, assumedPercent: 95, assignedAt: '2026-10-05T09:20:22.000Z' } };
// What an OLDER backend sends: no isFinal at all.
const oldBackendEstimate = { ...estimate, id: 't4', codeNumber: '250104', syntheticRating: { isSynthetic: true, assumedPercent: 80, assignedAt: '2026-10-05T09:20:22.000Z' } };
const replacedByReal = { ...base, id: 't5', codeNumber: '250105', syntheticRating: { isSynthetic: false, isFinal: false, assumedPercent: 40, assignedAt: '2026-10-05T09:20:22.000Z' } };

const withClient = (ui) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { queryClient, ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>) };
};

function TableHarness(props) {
  const columnVisibility = useColumnVisibility('dashboard.visibleColumns.v1', COLUMN_DEFINITIONS);
  return <TaskTable columnVisibility={columnVisibility} {...props} />;
}
function renderTable(isAdmin = true) {
  const onEditSyntheticRating = vi.fn();
  render(
    <TableHarness
      tasks={[base, estimate, final, oldBackendEstimate, replacedByReal]}
      meta={{ page: 1, totalPages: 1 }}
      isLoading={false}
      isError={false}
      isAdmin={isAdmin}
      page={1}
      pageSize={25}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      onEdit={vi.fn()}
      onUpdate={vi.fn()}
      onViewUpdates={vi.fn()}
      onSendReminder={vi.fn()}
      onEditSyntheticRating={onEditSyntheticRating}
      sortBy="deadline"
      sortOrder="asc"
      onSortChange={vi.fn()}
    />
  );
  return { onEditSyntheticRating };
}
const rowOf = (code) => screen.getByText(code).closest('tr');
const openRowMenu = (code) => fireEvent.click(within(rowOf(code)).getByLabelText('اقدامات'));

describe('a final rating — no "تخمینی" badge, in all five places', () => {
  beforeEach(() => window.localStorage.clear());

  it('desktop table: the estimate keeps its badge; the final rating shows only its band', () => {
    renderTable(false);
    expect(within(rowOf('250103')).getByText('تخمینی')).toBeInTheDocument();
    expect(within(rowOf('250126')).queryByText(/تخمینی/)).not.toBeInTheDocument();
    expect(rowOf('250126')).toHaveTextContent('ممتاز');
    expect(rowOf('250126')).toHaveTextContent('0%'); // the real completion percent, as stored
    expect(within(rowOf('250104')).getByText('تخمینی')).toBeInTheDocument(); // older backend: as today
  });

  it('mobile card: no marker and no dashed chip for a final rating', () => {
    const { container } = render(
      <>
        <TaskCard task={estimate} onOpen={vi.fn()} />
        <TaskCard task={final} onOpen={vi.fn()} />
      </>
    );
    const [estimateChip, finalChip] = container.querySelectorAll('[data-rating-chip]');
    expect(estimateChip.querySelector('[data-synthetic-marker]')).not.toBeNull();
    expect(finalChip.querySelector('[data-synthetic-marker]')).toBeNull();
    expect(finalChip).not.toHaveClass('border-dashed');
    expect(finalChip).toHaveTextContent('ممتاز');
  });

  it('mobile sheet: no "تخمینی — فرض کردہ" line for a final rating', () => {
    withClient(<TaskActionSheet task={final} isAdmin={false} onClose={vi.fn()} onUpdate={vi.fn()} onViewUpdates={vi.fn()} onEdit={vi.fn()} onSendReminder={vi.fn()} onEditSyntheticRating={vi.fn()} />);
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByText('ممتاز')).toBeInTheDocument();
    expect(within(sheet).queryByText(/فرض کردہ/)).not.toBeInTheDocument();
  });

  it('print view: no "تخمینی N%" beside a final rating', () => {
    render(<PrintView tasks={[estimate, final]} isVisible={() => true} />);
    expect(screen.getByText('250103').closest('tr')).toHaveTextContent('تخمینی 80%');
    expect(screen.getByText('250126').closest('tr')).not.toHaveTextContent('تخمینی');
  });

  it('Task Details (and so its PNG export): the rating line without the chip', async () => {
    getTask.mockResolvedValue(final);
    withClient(<PreviousUpdatesContent taskId={final.id} />);
    const line = (await screen.findByText('کارکردگی:')).parentElement;
    expect(line).toHaveTextContent('ممتاز');
    expect(line).not.toHaveTextContent('تخمینی');
  });
});

describe('the "تخمینی درجہ بندی تبدیل کریں" action', () => {
  beforeEach(() => window.localStorage.clear());

  it('desktop menu: disabled (not hidden) for a final rating, with the approved tooltip, in the neighbours\' disabled style', () => {
    const { onEditSyntheticRating } = renderTable();
    openRowMenu('250126');
    const action = screen.getByRole('button', { name: EDIT_LABEL });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute('title', FINAL_NOTE);
    expect(action).toHaveClass('disabled:opacity-40');
    // The same disabled style as "اپڈیٹ کریں" on this closed task.
    expect(screen.getByRole('button', { name: 'اپڈیٹ کریں' }).className).toBe(action.className);
    fireEvent.click(action);
    expect(onEditSyntheticRating).not.toHaveBeenCalled();
  });

  it('desktop menu: enabled for an estimate, and for an older backend\'s estimate; still hidden where there was never an estimate', () => {
    const { onEditSyntheticRating } = renderTable();
    openRowMenu('250103');
    const action = screen.getByRole('button', { name: EDIT_LABEL });
    expect(action).toBeEnabled();
    expect(action).toHaveAttribute('title', EDIT_LABEL);
    fireEvent.click(action);
    expect(onEditSyntheticRating).toHaveBeenCalledWith(estimate);

    openRowMenu('250104');
    expect(screen.getByRole('button', { name: EDIT_LABEL })).toBeEnabled();
  });

  it.each(['260801', '250105'])('desktop menu: not offered on %s (a real rating / a replaced estimate)', (code) => {
    renderTable();
    openRowMenu(code);
    expect(screen.getByRole('button', { name: 'پرانی اپڈیٹس' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: EDIT_LABEL })).not.toBeInTheDocument();
  });

  it('mobile sheet: disabled for a final rating, with the approved note under it', () => {
    const onEditSyntheticRating = vi.fn();
    withClient(<TaskActionSheet task={final} isAdmin onClose={vi.fn()} onUpdate={vi.fn()} onViewUpdates={vi.fn()} onEdit={vi.fn()} onSendReminder={vi.fn()} onEditSyntheticRating={onEditSyntheticRating} />);
    const sheet = screen.getByRole('dialog');
    const action = within(sheet).getByRole('button', { name: EDIT_LABEL });
    expect(action).toBeDisabled();
    expect(action).toHaveClass('disabled:opacity-45');
    expect(within(sheet).getByText(FINAL_NOTE)).toBeInTheDocument();
    fireEvent.click(action);
    expect(onEditSyntheticRating).not.toHaveBeenCalled();
  });

  it('mobile sheet: enabled for an estimate, no note; a normal user never sees it', () => {
    const { unmount } = withClient(<TaskActionSheet task={estimate} isAdmin onClose={vi.fn()} onUpdate={vi.fn()} onViewUpdates={vi.fn()} onEdit={vi.fn()} onSendReminder={vi.fn()} onEditSyntheticRating={vi.fn()} />);
    expect(screen.getByRole('button', { name: EDIT_LABEL })).toBeEnabled();
    expect(screen.queryByText(FINAL_NOTE)).not.toBeInTheDocument();
    unmount();

    withClient(<TaskActionSheet task={final} isAdmin={false} onClose={vi.fn()} onUpdate={vi.fn()} onViewUpdates={vi.fn()} onEdit={vi.fn()} onSendReminder={vi.fn()} onEditSyntheticRating={vi.fn()} />);
    expect(screen.queryByRole('button', { name: EDIT_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByText(FINAL_NOTE)).not.toBeInTheDocument();
  });
});

describe('saving: the confirmation that the new value is final', () => {
  const task = { ...estimate, syntheticRating: { ...estimate.syntheticRating, history: [] } };
  function renderDialog() {
    const onClose = vi.fn();
    const utils = withClient(<SyntheticRatingDialog isOpen onClose={onClose} task={task} />);
    return { ...utils, onClose };
  }
  const typeAndSave = (value) => {
    fireEvent.change(screen.getByLabelText(/نیا فرض کردہ فیصد/), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'محفوظ کریں' }));
  };
  beforeEach(() => {
    editSyntheticRating.mockReset();
    removeSyntheticRating.mockReset();
    toast.success.mockClear();
    toast.error.mockClear();
  });

  it('"محفوظ کریں" asks first — the amber redesign confirmation with the approved words — and sends nothing yet', () => {
    renderDialog();
    typeAndSave('95');

    const confirm = screen.getByRole('dialog', { name: EDIT_LABEL });
    expect(confirm).toHaveAttribute('data-modal-variant', 'redesign');
    expect(confirm.querySelector('[data-modal-icon]')).toHaveClass('bg-tk-amber-bg', 'text-tk-amber-text');
    expect(confirm.querySelector('p').textContent).toBe(
      'کام 250103 کی درجہ بندی ممتاز (95%) حتمی ہو جائے گی۔ اس کے بعد یہ تخمینی نہیں رہے گی اور اسے دوبارہ تبدیل یا ہٹایا نہیں جا سکے گا۔ کیا جاری رکھیں؟'
    );
    expect(within(confirm).getByRole('button', { name: 'ہاں، حتمی کریں' })).toHaveClass('bg-tk-amber-bg', 'text-tk-amber-text');
    expect(within(confirm).getByRole('button', { name: 'منسوخ کریں' })).toBeInTheDocument();
    expect(editSyntheticRating).not.toHaveBeenCalled();
  });

  it('the band in the question is the one the admin is about to save (no late downgrade)', () => {
    renderDialog();
    typeAndSave('72');
    expect(screen.getByRole('dialog', { name: EDIT_LABEL }).querySelector('p')).toHaveTextContent('کی درجہ بندی مناسب (72%) حتمی');
  });

  it('cancelling returns to the dialog with what was typed, and saves nothing', () => {
    const { onClose } = renderDialog();
    typeAndSave('95');
    fireEvent.click(within(screen.getByRole('dialog', { name: EDIT_LABEL })).getByRole('button', { name: 'منسوخ کریں' }));
    expect(screen.getByLabelText(/نیا فرض کردہ فیصد/)).toHaveValue(95);
    expect(editSyntheticRating).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('confirming saves, closes, and says so with the approved toast', async () => {
    editSyntheticRating.mockResolvedValue(final);
    const { onClose } = renderDialog();
    typeAndSave('95');
    fireEvent.click(screen.getByRole('button', { name: 'ہاں، حتمی کریں' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(editSyntheticRating).toHaveBeenCalledWith('t2', { assumedPercent: 95, note: undefined });
    expect(toast.success).toHaveBeenCalledWith('درجہ بندی حتمی کر دی گئی');
  });

  it('409 SYNTHETIC_RATING_FINAL (made final a moment ago elsewhere): the approved note as the one toast, the dialog closes, the lists refresh', async () => {
    editSyntheticRating.mockRejectedValue(new ApiError('This rating is final and can no longer be changed.', 'SYNTHETIC_RATING_FINAL'));
    const { onClose, queryClient } = renderDialog();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    typeAndSave('95');
    fireEvent.click(screen.getByRole('button', { name: 'ہاں، حتمی کریں' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(FINAL_NOTE);
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboardSummary'] });
  });

  it('any other error is toasted as before (the server\'s message), and the dialog stays open', async () => {
    editSyntheticRating.mockRejectedValue(new ApiError('Something else went wrong.', 'SERVER_ERROR'));
    const { onClose } = renderDialog();
    typeAndSave('95');
    fireEvent.click(screen.getByRole('button', { name: 'ہاں، حتمی کریں' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something else went wrong.'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/نیا فرض کردہ فیصد/)).toHaveValue(95);
  });

  it('removing an estimate is unchanged; if it was made final meanwhile, the approved note and the dialog closes', async () => {
    removeSyntheticRating.mockRejectedValue(new ApiError('This rating is final and can no longer be changed.', 'SYNTHETIC_RATING_FINAL'));
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'ہٹائیں' }));
    fireEvent.click(screen.getByRole('button', { name: 'ہاں، ہٹائیں' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith(FINAL_NOTE);
  });
});

describe('the KPI text follows the server: final ratings are counted as real', () => {
  // 1 estimate, 1 final and 1 real rating: the server counts only the estimate as synthetic.
  const ratings = {
    bands: { excellent: { count: 2, percent: 67 }, good: { count: 1, percent: 33 }, fair: { count: 0, percent: 0 }, weak: { count: 0, percent: 0 } },
    ratedCount: 3,
    unratedCount: 0,
    syntheticCount: 1,
    averageEffectivePercent: 90,
    overallQuality: { band: 'excellent', percent: 90 },
  };

  it('desktop: "3 میں سے 1 تخمینی"', () => {
    render(<QualityHero ratings={ratings} onToggleRating={vi.fn()} />);
    expect(screen.getByText('3 میں سے 1 تخمینی')).toBeInTheDocument();
  });

  it('mobile: "1 تخمینی • 2 اصل"', () => {
    render(
      <MemoryRouter>
        <QualityHeroCard ratings={ratings} hrefForRating={(r) => `/tasks?performanceRating=${r}`} />
      </MemoryRouter>
    );
    const line = screen.getByText(/1 تخمینی/);
    expect(line).toHaveTextContent('1 تخمینی • 2 اصل');
  });

  it('once every estimate is final there is no "تخمینی" line on the desktop at all', () => {
    render(<QualityHero ratings={{ ...ratings, syntheticCount: 0 }} onToggleRating={vi.fn()} />);
    expect(screen.queryByText(/تخمینی/)).not.toBeInTheDocument();
  });
});
