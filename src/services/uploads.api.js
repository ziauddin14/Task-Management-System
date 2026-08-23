import apiClient from './apiClient.js';

// docs/10-api-integration.md §1, docs/05-apis.md §7 — POST /uploads, multipart/form-data, field
// "file". onUploadProgress is forwarded straight to axios for the picker's progress indicator
// (docs/09-frontend-features.md §3). No explicit Content-Type header — axios sets the multipart
// boundary itself when given a FormData instance.
export async function uploadAttachment(file, onUploadProgress) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/uploads', formData, { onUploadProgress });
  return response.data.data;
}
