// The one loading phrase shown by every loader in the app (components/common/LoadingPhrase.jsx).
//
// VERBATIM — supplied by the client as-is. Never retype, re-transcribe, "correct" or normalize it:
// every diacritic (zabar, zer, pesh, shadda, jazm, khari zabar) and the wide run of spaces between
// the two halves is intentional. tests/utils/loadingPhrase.test.js guards its exact shape.
export const LOADING_PHRASE = 'صَلُّوْا عَلَی الْحَبِیْبْ!                 صَلَّی اللہُ تَعَالٰی عَلٰی مُحَمَّد';

// The two halves and the gap between them, derived from the constant above — never typed again.
const gapMatch = LOADING_PHRASE.match(/ {2,}/);
export const LOADING_PHRASE_FIRST = LOADING_PHRASE.slice(0, gapMatch.index);
export const LOADING_PHRASE_GAP = gapMatch[0];
export const LOADING_PHRASE_SECOND = LOADING_PHRASE.slice(gapMatch.index + gapMatch[0].length);
