import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AttachmentPicker from '../../../src/components/task/AttachmentPicker.jsx';

vi.mock('../../../src/services/uploads.api.js', () => ({ uploadAttachment: vi.fn() }));
import { uploadAttachment } from '../../../src/services/uploads.api.js';

function renderPicker() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onStatusChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AttachmentPicker onStatusChange={onStatusChange} />
    </QueryClientProvider>
  );
  return { ...utils, onStatusChange };
}

function selectFile(file) {
  const input = screen.getByLabelText('منسلکہ فائل');
  fireEvent.change(input, { target: { files: [file] } });
}

describe('AttachmentPicker (docs/09-frontend-features.md §3)', () => {
  beforeEach(() => uploadAttachment.mockReset());

  it('rejects an unsupported file type before ever calling the upload API', () => {
    const { onStatusChange } = renderPicker();
    selectFile(new File(['x'], 'virus.exe', { type: 'application/x-msdownload' }));

    expect(screen.getByText('یہ فائل فارمیٹ سپورٹ نہیں ہے۔')).toBeInTheDocument();
    expect(uploadAttachment).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalledWith('uploading', expect.anything());
  });

  it('rejects a file over 100MB before ever calling the upload API', () => {
    renderPicker();
    const bigFile = new File(['x'], 'huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(bigFile, 'size', { value: 101 * 1024 * 1024 });
    selectFile(bigFile);

    expect(screen.getByText('فائل 100MB سے زیادہ ہے۔')).toBeInTheDocument();
    expect(uploadAttachment).not.toHaveBeenCalled();
  });

  it('a valid file uploads immediately in the background and reports success', async () => {
    uploadAttachment.mockResolvedValue({ driveFileId: 'd1', fileName: 'report.pdf', url: 'https://drive/d1' });
    const { onStatusChange } = renderPicker();

    selectFile(new File(['x'], 'report.pdf', { type: 'application/pdf' }));

    expect(onStatusChange).toHaveBeenCalledWith('uploading', null);
    await waitFor(() =>
      expect(onStatusChange).toHaveBeenCalledWith('success', {
        driveFileId: 'd1',
        fileName: 'report.pdf',
        url: 'https://drive/d1',
      })
    );
  });

  it('a failed upload reports error status and offers a retry that re-attempts the same file', async () => {
    uploadAttachment.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce({
      driveFileId: 'd1',
      fileName: 'report.pdf',
      url: 'https://drive/d1',
    });
    const { onStatusChange } = renderPicker();

    selectFile(new File(['x'], 'report.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith('error', null));
    expect(screen.getByText('دوبارہ کوشش کریں')).toBeInTheDocument();

    fireEvent.click(screen.getByText('دوبارہ کوشش کریں'));
    await waitFor(() => expect(uploadAttachment).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(onStatusChange).toHaveBeenCalledWith('success', expect.objectContaining({ fileName: 'report.pdf' }))
    );
  });

  it('removing a picked file resets to idle and clears the picker', async () => {
    uploadAttachment.mockResolvedValue({ driveFileId: 'd1', fileName: 'report.pdf', url: 'https://drive/d1' });
    const { onStatusChange } = renderPicker();

    selectFile(new File(['x'], 'report.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(screen.getByText('report.pdf')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('ہٹا دیں'));

    expect(screen.queryByText('report.pdf')).not.toBeInTheDocument();
    expect(onStatusChange).toHaveBeenLastCalledWith('idle', null);
  });
});
