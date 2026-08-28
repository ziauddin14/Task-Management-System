import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PreviousUpdatesModal from '../../../src/components/task/PreviousUpdatesModal.jsx';

vi.mock('../../../src/services/tasks.api.js', () => ({
  getTask: vi.fn().mockResolvedValue({
    id: 't1',
    codeNumber: '260801',
    title: 'Sample task',
    deadline: '2026-09-01T00:00:00.000Z',
    status: 'ongoing',
    completionPercent: 40,
    timeStatus: { type: 'remaining', days: 5 },
  }),
}));
vi.mock('../../../src/services/taskUpdates.api.js', () => ({
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1, total: 0 } }),
  createTaskUpdate: vi.fn(),
}));

const mockToBlob = vi.fn((cb) => cb(new Blob(['x'], { type: 'image/png' })));
const mockCanvas = { toBlob: mockToBlob };
const mockHtml2canvas = vi.fn().mockResolvedValue(mockCanvas);
vi.mock('html2canvas', () => ({ default: (...args) => mockHtml2canvas(...args) }));

const mockSaveAs = vi.fn();
vi.mock('file-saver', () => ({ saveAs: (...args) => mockSaveAs(...args) }));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
import toast from 'react-hot-toast';

function renderModal(props) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PreviousUpdatesModal isOpen taskId="t1" onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

function setNavigatorShare({ canShare, share } = {}) {
  if (canShare) Object.defineProperty(window.navigator, 'canShare', { value: canShare, configurable: true });
  if (share) Object.defineProperty(window.navigator, 'share', { value: share, configurable: true });
}

function clearNavigatorShare() {
  delete window.navigator.canShare;
  delete window.navigator.share;
}

// Prompt 5A/5B — retitled "Kaam ki Tafseel" popup, with an Export-to-image button in the header
// that captures the popup's content via html2canvas and offers it through the same
// WhatsAppShareButton the report-export flow already uses.
describe('PreviousUpdatesModal (Prompt 5A/5B)', () => {
  beforeEach(() => {
    mockHtml2canvas.mockClear();
    mockToBlob.mockClear();
    mockSaveAs.mockClear();
    toast.error.mockClear();
    clearNavigatorShare();
  });

  it('titles the popup "کام کی تفصیل"', async () => {
    renderModal();
    expect(await screen.findByRole('dialog', { name: 'کام کی تفصیل' })).toBeInTheDocument();
  });

  it('Export button captures the content with html2canvas, downloads a PNG, and offers WhatsApp sharing', async () => {
    setNavigatorShare({ canShare: vi.fn(() => true), share: vi.fn().mockResolvedValue(undefined) });
    renderModal();
    await screen.findByText('260801');

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));

    await waitFor(() => expect(mockHtml2canvas).toHaveBeenCalled());
    expect(mockSaveAs).toHaveBeenCalled();
    expect(await screen.findByText('واٹس ایپ پر شیئر کریں')).toBeInTheDocument();
  });

  it('shares with the exact title "Kaam ki Tafseel"', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigatorShare({ canShare: vi.fn(() => true), share });
    renderModal();
    await screen.findByText('260801');

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    fireEvent.click(await screen.findByText('واٹس ایپ پر شیئر کریں'));

    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0][0]).toMatchObject({ title: 'Kaam ki Tafseel' });
  });

  it('shows the download-and-attach-manually fallback hint when the Web Share API is unavailable', async () => {
    renderModal();
    await screen.findByText('260801');

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));

    expect(await screen.findByText('ڈاؤن لوڈ ہونے والی فائل کو واٹس ایپ ڈیسک ٹاپ/ویب میں خود اٹیچ کر لیں۔')).toBeInTheDocument();
  });

  it('toasts an error and does not crash if html2canvas fails', async () => {
    mockHtml2canvas.mockRejectedValueOnce(new Error('capture failed'));
    renderModal();
    await screen.findByText('260801');

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('capture failed'));
    expect(screen.queryByText('واٹس ایپ پر شیئر کریں')).not.toBeInTheDocument();
  });
});
