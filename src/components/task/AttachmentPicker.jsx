import React, { useRef, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Paperclip, X, RotateCcw } from 'lucide-react';
import { useUploadAttachment } from '../../hooks/useUploadAttachment.js';
import { validateAttachmentFile } from '../../utils/attachmentValidation.js';

// docs/09-frontend-features.md §3 — client-side pre-check before upload starts; on a valid file,
// immediately POST /uploads in the background with a progress indicator; the parent's Save is
// disabled while `status === 'uploading'` (via onStatusChange) and re-enabled once it resolves
// either way; a failed upload shows a retry affordance and doesn't block saving without an
// attachment (removing it is always available). onStatusChange(status, attachmentOrNull) fires on
// every transition so the parent always has both pieces of state it needs.
function AttachmentPicker({ onStatusChange }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [progress, setProgress] = useState(0);
  const [precheckError, setPrecheckError] = useState(null);
  const uploadMutation = useUploadAttachment();

  function startUpload(selectedFile) {
    setStatus('uploading');
    setProgress(0);
    onStatusChange('uploading', null);
    uploadMutation.mutate(
      {
        file: selectedFile,
        onUploadProgress: (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
      {
        onSuccess: (result) => {
          setStatus('success');
          onStatusChange('success', result);
        },
        onError: () => {
          setStatus('error');
          onStatusChange('error', null);
        },
      }
    );
  }

  function handleFileSelect(event) {
    const selected = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file after a remove/retry
    if (!selected) return;

    const error = validateAttachmentFile(selected);
    if (error) {
      setPrecheckError(error);
      setFile(null);
      setStatus('idle');
      onStatusChange('idle', null);
      return;
    }
    setPrecheckError(null);
    setFile(selected);
    startUpload(selected);
  }

  function handleRemove() {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setPrecheckError(null);
    onStatusChange('idle', null);
  }

  function handleRetry() {
    if (file) startUpload(file);
  }

  return (
    <div>
      {!file && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-tk-tile border-2 border-dashed border-tk-line-btn text-[13px] leading-tk-label text-tk-muted transition-colors hover:border-tk-green-700 hover:bg-tk-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700"
        >
          <Paperclip className="h-[18px] w-[18px]" aria-hidden="true" />
          اٹیچمنٹ لگائیں (اختیاری)
        </button>
      )}
      <input ref={inputRef} type="file" onChange={handleFileSelect} className="hidden" aria-label="منسلکہ فائل" />

      {precheckError && (
        <p role="alert" className="mt-1 text-[13px] leading-tk-label text-tk-danger">
          {precheckError}
        </p>
      )}

      {file && (
        <div className="flex min-h-[52px] items-center gap-2 rounded-tk-tile border border-tk-line bg-tk-surface px-3 text-[13px]">
          <Paperclip className="h-4 w-4 shrink-0 text-tk-muted" aria-hidden="true" />
          <span className="flex-1 truncate">{file.name}</span>
          {status === 'uploading' && (
            <span role="status" className="text-xs text-tk-muted">
              {progress}%
            </span>
          )}
          {status === 'error' && (
            <button
              type="button"
              onClick={handleRetry}
              className="flex h-[44px] min-w-[40px] items-center gap-1 text-xs font-semibold text-tk-green-700"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              دوبارہ کوشش کریں
            </button>
          )}
          <button
            type="button"
            onClick={handleRemove}
            aria-label="ہٹا دیں"
            className="flex h-[44px] w-[44px] items-center justify-center rounded-tk-chip text-tk-muted hover:bg-tk-danger-bg hover:text-tk-danger"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export default AttachmentPicker;
