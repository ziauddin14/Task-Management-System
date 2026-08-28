import { useCallback, useState } from 'react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { exportReport } from '../services/reports.api.js';
import { buildExportFilename, MIME_TYPES } from '../utils/exportFilename.js';

// docs/10-api-integration.md §5 — NOT React Query (the response is a binary blob, not cacheable
// JSON): a plain async function wrapped in a small custom hook that owns its own isLoading state.
// docs/09-frontend-features.md §8 steps 3-5 — loading/disabled state during generation, download
// on success, toast + re-enable on failure. Since this bypasses React Query entirely, the global
// mutations.onError toast (App.jsx) does NOT apply here — errors are toasted directly below.
export function useExportReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [exportedFile, setExportedFile] = useState(null);

  const run = useCallback(async (params) => {
    setIsLoading(true);
    try {
      const blob = await exportReport(params);
      const filename = buildExportFilename(`task-report-${params.reportType}`, params.format);
      const file = new File([blob], filename, { type: blob.type || MIME_TYPES[params.format] });
      saveAs(blob, filename);
      setExportedFile(file);
      return file;
    } catch (err) {
      toast.error(err.message || 'ایکسپورٹ ممکن نہیں ہوا۔');
      setExportedFile(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { run, isLoading, exportedFile };
}
