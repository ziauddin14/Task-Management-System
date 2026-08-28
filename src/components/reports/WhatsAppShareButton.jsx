import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { MessageCircle } from 'lucide-react';

// docs/09-frontend-features.md §1 — corrected design: Web Share API with a files array, NOT a
// wa.me link (which can't attach a file). Appears only after a successful export (file prop is
// the just-exported File, or null/undefined before/absent one). Fallback (desktop, or any browser
// without file-sharing support): a calm one-line hint instead of a button — never framed as an
// error, since it's a real platform limitation shared by every website, not a missing feature.
function WhatsAppShareButton({ file, title = 'Task Report' }) {
  if (!file) return null;

  const canShareFile =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    navigator.canShare({ files: [file] });

  if (!canShareFile) {
    return <p className="mt-2 text-sm text-gray-500">ڈاؤن لوڈ ہونے والی فائل کو واٹس ایپ ڈیسک ٹاپ/ویب میں خود اٹیچ کر لیں۔</p>;
  }

  async function handleShare() {
    try {
      await navigator.share({ files: [file], title });
    } catch {
      // User cancelled the native share sheet, or the OS-level share failed — the file has
      // already downloaded successfully regardless, so no error UI is needed here.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="mt-2 flex h-10 w-fit items-center gap-2 rounded-lg border border-green-600 px-3 text-sm text-green-700 hover:bg-green-50"
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      واٹس ایپ پر شیئر کریں
    </button>
  );
}

export default WhatsAppShareButton;
