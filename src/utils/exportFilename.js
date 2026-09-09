// Mirrors backend/src/controllers/reports.controller.js's own filename convention exactly
// (`${filenamePrefix}-${todayStamp()}.${EXTENSIONS[format]}`) so the downloaded/shared file's name
// matches what the backend itself would have named it via Content-Disposition.
export const EXTENSIONS = { excel: 'xlsx', pdf: 'pdf', jpeg: 'jpg', docx: 'docx' };

export const MIME_TYPES = {
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  jpeg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function buildExportFilename(prefix, format) {
  return `${prefix}-${todayStamp()}.${EXTENSIONS[format]}`;
}
