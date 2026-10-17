import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  activityTypeLabel,
  deviceLabel,
  inactiveAlertText,
  inactiveTileLabel,
  isValidInactivityDays,
  noActivityText,
} from '../../src/utils/activityLog.js';

describe('utils/activityLog', () => {
  it('has the approved label for every one of the 20 event types the backend records', () => {
    expect(ACTIVITY_TYPES).toEqual([
      'LOGIN',
      'LOGOUT',
      'TASK_CREATED',
      'TASK_EDITED',
      'TASK_REASSIGNED',
      'TASK_CLOSED',
      'TASK_UPDATE_CREATED',
      'TASK_RECEIPT_CONFIRMED',
      'NOTIFICATION_SENT',
      'REMINDERS_TRIGGERED',
      'USER_CREATED',
      'USER_UPDATED',
      'USER_DEACTIVATED',
      'USER_REACTIVATED',
      'SYNTHETIC_RATING_EDITED',
      'SYNTHETIC_RATING_REMOVED',
      'REPORT_EXPORTED',
      'USER_SUMMARY_EXPORTED',
      'LOOKUP_LIST_CHANGED',
      'SETTINGS_CHANGED',
    ]);
    expect(ACTIVITY_TYPE_LABELS.LOGIN).toBe('لاگ ان');
    expect(ACTIVITY_TYPE_LABELS.TASK_RECEIPT_CONFIRMED).toBe('کام وصول کیا');
    expect(ACTIVITY_TYPE_LABELS.SETTINGS_CHANGED).toBe('ترتیب تبدیل کی');
    // "غیر فعال" means a deactivated account and is never used for an event or for inactivity.
    Object.values(ACTIVITY_TYPE_LABELS).forEach((label) => expect(label).not.toContain('غیر فعال'));
  });

  it('an unknown type shows as its own code, never blank', () => {
    expect(activityTypeLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(activityTypeLabel(undefined)).toBe('-');
  });

  it('device: browser and OS in English, the device type in Urdu; unknown parts left out', () => {
    expect(deviceLabel({ browser: 'Chrome', os: 'Windows', deviceType: 'desktop' })).toBe('Chrome · Windows · کمپیوٹر');
    expect(deviceLabel({ browser: 'Safari', os: 'iOS', deviceType: 'mobile' })).toBe('Safari · iOS · موبائل');
    expect(deviceLabel({ browser: 'Other', os: 'Android', deviceType: 'tablet' })).toBe('Android · ٹیبلٹ');
    expect(deviceLabel(null)).toBe('');
  });

  it('the approved sentences, singular and plural', () => {
    expect(inactiveAlertText(1, 7)).toBe('1 صارف 7 دن سے غیر متحرک ہے');
    expect(inactiveAlertText(3, 7)).toBe('3 صارفین 7 دن سے غیر متحرک ہیں');
    expect(inactiveTileLabel(14)).toBe('14 دن سے زیادہ غیر متحرک');
    expect(noActivityText('10-10-26')).toBe('10-10-26 سے کوئی ایکٹیویٹی ریکارڈ نہیں ہوئی');
  });

  it('inactivity days: a whole number from 1 to 90 only', () => {
    ['1', '7', '90', ' 14 '].forEach((value) => expect(isValidInactivityDays(value)).toBe(true));
    ['0', '91', '7.5', '-3', '', 'abc', '1e1', null, undefined].forEach((value) => expect(isValidInactivityDays(value)).toBe(false));
  });
});
