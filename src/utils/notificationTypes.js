import { AlertTriangle, Bell, CalendarClock, CalendarDays, Megaphone, UserCheck } from 'lucide-react';

// Locked blueprint §3/§Notification Types — frontend mirror of the backend's NOTIFICATION_TYPES
// registry (utils/dashboardColumns.js's own established pattern: one plain-object lookup table,
// not scattered per-component type checks). Phase 1 has no caller that produces a real
// notification of any of these types yet (Phase 2/3, not built) — this exists purely so
// NotificationItem's per-type icon lookup has one place to extend later, ready without needing to
// touch the item component itself when Phase 2/3 lands.
export const NOTIFICATION_TYPES = Object.freeze({
  ADMIN_BROADCAST: 'ADMIN_BROADCAST',
  USER_REMINDER: 'USER_REMINDER',
  TASK_REMINDER: 'TASK_REMINDER',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
  TASK_DUE_TOMORROW: 'TASK_DUE_TOMORROW',
  TASK_OVERDUE: 'TASK_OVERDUE',
});

const ICON_BY_TYPE = {
  [NOTIFICATION_TYPES.ADMIN_BROADCAST]: Megaphone,
  [NOTIFICATION_TYPES.USER_REMINDER]: UserCheck,
  [NOTIFICATION_TYPES.TASK_REMINDER]: Bell,
  [NOTIFICATION_TYPES.TASK_DUE_SOON]: CalendarClock,
  [NOTIFICATION_TYPES.TASK_DUE_TOMORROW]: CalendarDays,
  [NOTIFICATION_TYPES.TASK_OVERDUE]: AlertTriangle,
};

// Falls back to the generic bell for any type not in the table above — including a type Phase 1
// has never seen yet, so a future Phase 2/3 addition here never risks an item failing to render.
export function getNotificationIcon(type) {
  return ICON_BY_TYPE[type] ?? Bell;
}
