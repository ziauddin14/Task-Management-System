// Attachment file names stored before the upload fix are garbled: the browser sent the name as
// UTF-8, and the server's multer read it as Latin-1 (its default), so "اجلاس.pdf" was saved as
// "Ø§Ø¬ÙØ§Ø³.pdf" (fixed at the source in the backend's validators/upload.validator.js). This undoes
// that for display only — nothing stored is changed. Guarded so it never harms a correct name: it
// acts only when every character fits in one Latin-1 byte and at least one is beyond ASCII (a
// correct Urdu name has characters beyond Latin-1 and comes back as it is), and only when those
// bytes are valid UTF-8 (so a real Latin-1 name such as "café.pdf" comes back as it is). A missing
// or empty name comes back unchanged. The backend has the same helper (src/utils/fileName.js), used
// by the Excel/PDF/Word reports.
export function repairFileName(name) {
  if (typeof name !== 'string' || name === '') return name;
  let beyondAscii = false;
  for (const char of name) {
    const code = char.codePointAt(0);
    if (code > 0xff) return name;
    if (code > 0x7f) beyondAscii = true;
  }
  if (!beyondAscii) return name;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(name, (char) => char.charCodeAt(0)));
  } catch {
    return name;
  }
}
