import { Bell, FileText, LayoutGrid, ListChecks, UserRound } from 'lucide-react';

// The two destinations that share the dashboard's filters (one filter state in the query string):
// moving between them keeps the query, so the KPIs and the task list always describe the same set.
export const FILTER_SHARING_PATHS = ['/', '/tasks'];
// Screens that have no tab of their own and are reached through "مزید".
export const MORE_PATHS = ['/settings', '/users'];

// The bottom tabs a role gets. Each one is an existing route or an existing feature — nothing
// here is new functionality:
//   ڈیش بورڈ  — "/"  (the KPIs)
//   ٹاسک     — "/tasks"  (the task list; the same page and filters as the dashboard's table)
//   رپورٹس   — "/reports/user-summary", Admin-only like the route itself, so a normal user has
//              no such tab
//   اطلاعات  — opens the notification drawer the bell already opens (no `to`)
//   مزید     — opens the menu that holds what the old drawer held: settings, users, logout
export function tabsForRole(isAdmin) {
  return [
    { key: 'dashboard', label: 'ڈیش بورڈ', icon: LayoutGrid, to: '/' },
    { key: 'tasks', label: 'ٹاسک', icon: ListChecks, to: '/tasks' },
    ...(isAdmin ? [{ key: 'reports', label: 'رپورٹس', icon: FileText, to: '/reports/user-summary' }] : []),
    { key: 'notifications', label: 'اطلاعات', icon: Bell },
    { key: 'more', label: 'مزید', icon: UserRound },
  ];
}
