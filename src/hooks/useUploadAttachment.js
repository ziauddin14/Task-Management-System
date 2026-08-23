import { useMutation } from '@tanstack/react-query';
import { uploadAttachment } from '../services/uploads.api.js';

// docs/10-api-integration.md §4 — POST /uploads. No cache effect (not cached data) — returns
// { driveFileId, fileName, url } directly to the caller (components/task/AttachmentPicker.jsx),
// which holds it in local form state until Save. Supports an onUploadProgress callback passed
// through to axios for the progress indicator.
export function useUploadAttachment() {
  return useMutation({
    mutationFn: ({ file, onUploadProgress }) => uploadAttachment(file, onUploadProgress),
  });
}
