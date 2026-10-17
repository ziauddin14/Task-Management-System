// The activity log's wording (owner-approved) and small display helpers. Admin-only screens.
// "غیر متحرک" (no recent activity) is a different thing from "غیر فعال" (a deactivated account),
// which keeps its existing meaning everywhere.

// Every event type the backend records (backend/src/utils/activityTypes.js), in the order the
// timeline's filter lists them.
export const ACTIVITY_TYPE_LABELS = {
  LOGIN: 'لاگ ان',
  LOGOUT: 'لاگ آؤٹ',
  TASK_CREATED: 'نیا کام بنایا',
  TASK_EDITED: 'کام میں ترمیم کی',
  TASK_REASSIGNED: 'ذمہ دار تبدیل کیا',
  TASK_CLOSED: 'کام بند کیا',
  TASK_UPDATE_CREATED: 'اپڈیٹ درج کی',
  TASK_RECEIPT_CONFIRMED: 'کام وصول کیا',
  NOTIFICATION_SENT: 'اطلاع بھیجی',
  REMINDERS_TRIGGERED: 'یاد دہانیاں بھیجیں',
  USER_CREATED: 'نیا صارف بنایا',
  USER_UPDATED: 'صارف میں ترمیم کی',
  USER_DEACTIVATED: 'صارف بند کیا',
  USER_REACTIVATED: 'صارف بحال کیا',
  SYNTHETIC_RATING_EDITED: 'تخمینی درجہ بندی تبدیل کی',
  SYNTHETIC_RATING_REMOVED: 'تخمینی درجہ بندی ہٹائی',
  REPORT_EXPORTED: 'رپورٹ ایکسپورٹ کی',
  USER_SUMMARY_EXPORTED: 'یوزر سمری ایکسپورٹ کی',
  LOOKUP_LIST_CHANGED: 'ذمہ داریوں کی فہرست بدلی',
  SETTINGS_CHANGED: 'ترتیب تبدیل کی',
};

export const ACTIVITY_TYPES = Object.keys(ACTIVITY_TYPE_LABELS);

// A type this screen does not know yet (a newer backend) shows as its own code, never as blank.
export function activityTypeLabel(type) {
  return ACTIVITY_TYPE_LABELS[type] || type || '-';
}

const DEVICE_TYPE_LABELS = { desktop: 'کمپیوٹر', mobile: 'موبائل', tablet: 'ٹیبلٹ' };

// "Chrome · Windows · کمپیوٹر" — browser and OS names stay in English. A part the backend could
// not tell ("Other") is left out rather than shown.
export function deviceLabel(device) {
  if (!device) return '';
  const known = (value) => value && value !== 'Other';
  return [known(device.browser) && device.browser, known(device.os) && device.os, DEVICE_TYPE_LABELS[device.deviceType]]
    .filter(Boolean)
    .join(' · ');
}

export function inactiveTileLabel(days) {
  return `${days} دن سے زیادہ غیر متحرک`;
}

export function inactiveAlertText(count, days) {
  return count === 1 ? `1 صارف ${days} دن سے غیر متحرک ہے` : `${count} صارفین ${days} دن سے غیر متحرک ہیں`;
}

// Said of someone with nothing recorded since the log began — neutral, never "never signed in".
export function noActivityText(date) {
  return `${date} سے کوئی ایکٹیویٹی ریکارڈ نہیں ہوئی`;
}

export const INACTIVE_BADGE = 'غیر متحرک';
export const NOT_RECORDED = 'ریکارڈ نہیں';

// The Settings card's limits (the backend checks them again: 1–90 whole days).
export const MIN_INACTIVITY_DAYS = 1;
export const MAX_INACTIVITY_DAYS = 90;

export function isValidInactivityDays(raw) {
  const text = String(raw ?? '').trim();
  if (!/^\d+$/.test(text)) return false;
  const days = Number(text);
  return days >= MIN_INACTIVITY_DAYS && days <= MAX_INACTIVITY_DAYS;
}
