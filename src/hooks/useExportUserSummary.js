import { useCallback, useState } from 'react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { exportUserSummary } from '../services/reports.api.js';
import { buildExportFilename, MIME_TYPES } from '../utils/exportFilename.js';

// docs/10-api-integration.md §5 — same non-React-Query pattern as useExportReport.js (own
// isLoading state, no cache key). GET /reports/user-summary has no reportType field (Admin-only,
// docs/05-apis.md §9), so params here is just { format, columns }.
export function useExportUserSummary() {
  const [isLoading, setIsLoading] = useState(false);
  const [exportedFile, setExportedFile] = useState(null);

  const run = useCallback(async (params) => {
    setIsLoading(true);
    try {
      const blob = await exportUserSummary(params);
      const filename = buildExportFilename('user-summary', params.format);
      const file = new File([blob], filename, { type: blob.type || MIME_TYPES[params.format] });
      saveAs(blob, filename);
      setExportedFile(file);
      return file;
    } catch (err) {
      toast.error(err.message || 'Export mumkin nahi hua.');
      setExportedFile(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { run, isLoading, exportedFile };
}
