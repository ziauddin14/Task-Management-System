// Locked blueprint §Phase 2/Template System — UI-only mirror of the backend's authoritative
// registry (backend/src/utils/notificationTemplates.js). This file exists purely to render the
// picker's labels; the server independently validates any submitted templateKey and resolves the
// real title/message that gets stored (docs — the client is never trusted to supply final
// content for a template it merely names). Keys here MUST stay in sync with the backend's own.
export const NOTIFICATION_TEMPLATES = [
  { key: 'GENERAL_REMINDER', label: 'عمومی یاد دہانی' },
  { key: 'COMPLETE_TASK_REMINDER', label: 'کام مکمل کرنے کی یاد دہانی' },
  { key: 'DEADLINE_APPROACHING', label: 'کام کی آخری تاریخ قریب ہے' },
  { key: 'URGENT_ATTENTION', label: 'فوری توجہ درکار ہے' },
];
