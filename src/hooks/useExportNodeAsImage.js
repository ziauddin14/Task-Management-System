import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { todayStamp } from '../utils/exportFilename.js';

// Prompt 5B — captures a DOM node (the "Kaam ki Tafseel" popup's summary + updates tables) to a
// PNG, mirroring useExportReport.js's own shape (run/isLoading/exportedFile) so the same
// WhatsAppShareButton.jsx already used by the report-export flow works here unchanged — it only
// needs a File, it doesn't care how that File was produced.
//
// `scale: 2` renders at 2x pixel density (sharper text in the shared image, closer to what a
// screenshot on a real phone would look like) — html2canvas defaults to devicePixelRatio, which
// in this sandbox/CI environment is 1, so this is set explicitly rather than relied on.
// `backgroundColor: '#ffffff'` guards against a transparent PNG if the target node's own
// background doesn't fully cover it for any reason.
export function useExportNodeAsImage() {
  const [isLoading, setIsLoading] = useState(false);
  const [exportedFile, setExportedFile] = useState(null);

  const run = useCallback(async (node, filenamePrefix) => {
    if (!node) return null;
    setIsLoading(true);
    try {
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Canvas is empty'))), 'image/png');
      });
      const filename = `${filenamePrefix}-${todayStamp()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
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

  const reset = useCallback(() => setExportedFile(null), []);

  return { run, isLoading, exportedFile, reset };
}
