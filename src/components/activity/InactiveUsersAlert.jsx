import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { Link } from 'react-router-dom';
import { UserX } from 'lucide-react';
import { useActivitySummary } from '../../hooks/useActivitySummary.js';
import { inactiveAlertText } from '../../utils/activityLog.js';

// The dashboard's one-line inactivity alert — Admins only, desktop and mobile alike. It says how
// many active accounts have had no activity for more than N days and opens the activity log with
// only them listed. Nothing at all is rendered for anyone else, while it loads, when nobody is
// inactive, or when the summary cannot be read (an older backend, a failure): the dashboard then
// looks exactly as it always did. Built like the mobile AttentionBanner, in the red "weak" tint.
function InactiveUsersAlert({ isAdmin }) {
  const summaryQuery = useActivitySummary({ enabled: Boolean(isAdmin) });
  const summary = summaryQuery.data;

  if (!isAdmin || summaryQuery.isError || !summary) return null;
  const count = Number(summary.inactiveCount) || 0;
  if (count <= 0) return null;

  return (
    <Link
      to="/activity?inactive=1"
      data-inactive-alert
      className="tk-rise flex min-h-[64px] items-center gap-tk-gap rounded-tk-tile bg-tk-weak-tint px-tk-card py-[10px] text-tk-weak-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-weak"
    >
      <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-tk-chip bg-white/70">
        <UserX className="h-[22px] w-[22px] text-tk-weak" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-[15px] font-semibold leading-tk-title">{inactiveAlertText(count, summary.inactivityDays)}</span>
      <span className="shrink-0 text-[13px] font-semibold leading-tk-title">
        دیکھیں <span aria-hidden="true">‹</span>
      </span>
    </Link>
  );
}

export default InactiveUsersAlert;
