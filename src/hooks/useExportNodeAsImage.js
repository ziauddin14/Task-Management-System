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
export function isExcludedFromExport(element) {
  return Boolean(element?.hasAttribute?.('data-export-exclude'));
}

// Prepares the copy html2canvas draws (never what is on screen), through its `onclone`:
//
// - html2canvas draws text word by word, from each word's boxes as the browser reports them; a word
//   reported as more than one box is drawn letter by letter, which breaks Urdu joining. Every visible
//   word of a text cut off with "…" is such a word — the Task Details title came out as separate
//   letters, and a leading "15" lost its "1". So text marked data-export-wrap wraps instead, at the
//   width it has on screen, and the image shows the whole of it.
// - A table wider than the screen (on a phone) sits in a horizontally scrolling box, of which only
//   the part scrolled into view would be drawn. In such a table, a cell whose text wraps
//   (white-space normal, with a max-width — the update's description) is given that max-width, as
//   on a wide screen, rather than squeezed to one word per line; then the copy is widened by the
//   widest overflow, so every column is in the image. Nothing overflows on a desktop, so nothing
//   changes there.
export function prepareExportClone(clonedNode) {
  const view = clonedNode.ownerDocument.defaultView;
  clonedNode.querySelectorAll('[data-export-wrap]').forEach((element) => {
    const width = `${element.getBoundingClientRect().width}px`;
    Object.assign(element.style, { whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', width, minWidth: width, maxWidth: width });
  });
  const overflowing = [...clonedNode.querySelectorAll('*')].filter(
    (element) => ['auto', 'scroll'].includes(view.getComputedStyle(element).overflowX) && element.scrollWidth > element.clientWidth
  );
  if (overflowing.length === 0) return;
  overflowing.forEach((box) =>
    box.querySelectorAll('th, td').forEach((cell) => {
      const { whiteSpace, maxWidth } = view.getComputedStyle(cell);
      if (whiteSpace === 'normal' && maxWidth.endsWith('px')) Object.assign(cell.style, { width: maxWidth, minWidth: maxWidth });
    })
  );
  const extra = Math.max(0, ...overflowing.map((box) => box.scrollWidth - box.clientWidth));
  const width = `${clonedNode.getBoundingClientRect().width + extra}px`;
  Object.assign(clonedNode.style, { width, minWidth: width, maxWidth: 'none' });
}

export function useExportNodeAsImage() {
  const [isLoading, setIsLoading] = useState(false);
  const [exportedFile, setExportedFile] = useState(null);

  const run = useCallback(async (node, filenamePrefix) => {
    if (!node) return null;
    setIsLoading(true);
    try {
      // Anything marked data-export-exclude is on screen only and is left out of the image
      // altogether (html2canvas lays the copy out without it, so no gap is left either) — the Task
      // Details dialog's receipt row (components/task/ReceiptDetailRow.jsx).
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        ignoreElements: isExcludedFromExport,
        onclone: (_clonedDocument, clonedNode) => prepareExportClone(clonedNode),
      });
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
