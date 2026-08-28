// Mirrors backend/src/validators/upload.validator.js's ALLOWED_MIME_TYPES + MAX_FILE_SIZE_BYTES
// exactly (docs/05-apis.md §7: "PDF, Word, Excel, and common image formats," max 100MB) — kept in
// sync manually since frontend/backend are separate projects with no shared code. If the backend
// list ever changes, this must be updated to match.
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

// docs/09-frontend-features.md §3 — client-side pre-check BEFORE upload even starts, so a bad
// file is rejected immediately without wasting an upload attempt. Returns an inline Urdu message,
// or null when the file is fine.
export function validateAttachmentFile(file) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return 'یہ فائل فارمیٹ سپورٹ نہیں ہے۔';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'فائل 100MB سے زیادہ ہے۔';
  }
  return null;
}
