import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { formatKarachiDate, formatKarachiDateTime } from '../../utils/karachiTime.js';
import { INACTIVE_BADGE, NOT_RECORDED, activityTypeLabel, noActivityText } from '../../utils/activityLog.js';

const CHIP_CLASS = 'inline-flex items-center gap-[6px] whitespace-nowrap rounded-tk-pill px-3 text-[12.5px] leading-[2.2]';
const TH_CLASS = 'whitespace-nowrap px-5 py-[10px] text-start text-[12.5px] font-semibold';
const TD_CLASS = 'px-5 py-[8px] align-middle';
const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700';

// "غیر متحرک" — no activity for more than N days (red). "غیر فعال" — a deactivated account (grey,
// exactly as on the Users page); such an account is listed only when searched for, never flagged.
function StateChip({ row }) {
  if (row.isInactive) {
    return <span className={clsx(CHIP_CLASS, 'bg-white font-semibold text-tk-weak-ink ring-1 ring-tk-danger-line')}>{INACTIVE_BADGE}</span>;
  }
  if (!row.isActive) {
    return (
      <span className={clsx(CHIP_CLASS, 'bg-tk-track text-tk-ink-soft')}>
        <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-tk-muted" />
        غیر فعال
      </span>
    );
  }
  return null;
}

function lastActivityText(row, baselineAt) {
  if (row.noActivityRecorded) return noActivityText(formatKarachiDate(baselineAt));
  return formatKarachiDateTime(row.lastActiveAt);
}

function LastAction({ action }) {
  if (!action) return <span className="text-tk-muted">-</span>;
  return (
    <span className="flex flex-col">
      <span className="whitespace-nowrap">
        {activityTypeLabel(action.type)}
        {action.taskCode && (
          <>
            {' · '}
            <span dir="ltr">{action.taskCode}</span>
          </>
        )}
      </span>
      <span dir="ltr" className="text-end text-[12px] text-tk-muted">
        {formatKarachiDateTime(action.at)}
      </span>
    </span>
  );
}

// The activity log's list: one row per account, most inactive first (the server's order). A row
// flagged inactive is tinted red and carries the badge. The person's name opens their timeline.
// Below 768px each account is a card (the whole card opens the timeline), with the same facts
// labelled, so nothing needs sideways scrolling.
function ActivityUserList({ rows, baselineAt, isLoading, isError, onOpen }) {
  const isMobile = useIsMobile();

  if (isLoading) return <LoadingPhrase label="صارفین لوڈ ہو رہے ہیں…" />;
  if (isError) return <EmptyState message="صارفین لوڈ نہیں ہو سکے۔ دوبارہ کوشش کریں۔" />;
  if (rows.length === 0) return <EmptyState message="اس تلاش سے مطابقت رکھنے والا کوئی صارف نہیں ملا۔" />;

  if (isMobile) {
    return (
      <ul className="flex flex-col gap-tk-gap" data-activity-cards>
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onOpen(row)}
              data-inactive={row.isInactive || undefined}
              className={clsx(
                'flex w-full flex-col gap-[8px] rounded-tk-card p-tk-card text-start text-tk-ink shadow-tk-soft',
                FOCUS_RING,
                row.isInactive ? 'bg-tk-weak-tint' : 'bg-tk-card'
              )}
            >
              <span className="flex w-full items-center gap-[10px]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold leading-tk-label">{row.name}</span>
                  <span className="block truncate text-[13px] leading-tk-label text-tk-ink-soft">{row.responsibility}</span>
                </span>
                <StateChip row={row} />
              </span>
              <dl className="grid w-full grid-cols-2 gap-x-3 gap-y-[6px] text-[13px] leading-tk-label">
                <div className="min-w-0">
                  <dt className="text-[12px] text-tk-muted">آخری لاگ ان</dt>
                  <dd dir={row.lastLoginAt ? 'ltr' : undefined} className={clsx(row.lastLoginAt && 'text-end')}>
                    {row.lastLoginAt ? formatKarachiDateTime(row.lastLoginAt) : NOT_RECORDED}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] text-tk-muted">آخری ایکٹیویٹی</dt>
                  <dd dir={row.noActivityRecorded ? undefined : 'ltr'} className={clsx(!row.noActivityRecorded && 'text-end')}>
                    {lastActivityText(row, baselineAt)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] text-tk-muted">آخری اقدام</dt>
                  <dd>
                    <LastAction action={row.lastAction} />
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] text-tk-muted">ایکٹیویٹی کے بغیر دن</dt>
                  <dd className={clsx(row.isInactive && 'font-semibold text-tk-weak')}>{row.daysSinceActivity}</dd>
                </div>
              </dl>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="tk-rise tk-d2 overflow-x-auto rounded-tk-panel bg-tk-card text-tk-ink shadow-tk-card">
      <table className="w-full text-start text-[13px]">
        <thead className="bg-tk-surface text-tk-muted">
          <tr>
            <th className={TH_CLASS}>نام</th>
            <th className={TH_CLASS}>ذمہ داری</th>
            <th className={TH_CLASS}>آخری لاگ ان</th>
            <th className={TH_CLASS}>آخری ایکٹیویٹی</th>
            <th className={TH_CLASS}>آخری اقدام</th>
            <th className={TH_CLASS}>ایکٹیویٹی کے بغیر دن</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              data-inactive={row.isInactive || undefined}
              className={clsx(
                'border-t border-tk-line-row transition-colors motion-reduce:transition-none',
                row.isInactive ? 'bg-tk-weak-tint' : 'hover:bg-tk-hover'
              )}
            >
              <td className={TD_CLASS}>
                <div className="flex items-center gap-[10px]">
                  <button
                    type="button"
                    onClick={() => onOpen(row)}
                    className={clsx('whitespace-nowrap rounded-[6px] text-start text-[14px] font-semibold leading-tk-title text-tk-green-900 hover:underline', FOCUS_RING)}
                  >
                    {row.name}
                  </button>
                  <StateChip row={row} />
                </div>
              </td>
              <td className={clsx(TD_CLASS, 'leading-tk-title')}>{row.responsibility}</td>
              <td className={clsx(TD_CLASS, 'whitespace-nowrap')}>
                {row.lastLoginAt ? <span dir="ltr">{formatKarachiDateTime(row.lastLoginAt)}</span> : <span className="text-tk-muted">{NOT_RECORDED}</span>}
              </td>
              <td className={clsx(TD_CLASS, row.noActivityRecorded ? 'text-tk-muted' : 'whitespace-nowrap')}>
                {row.noActivityRecorded ? lastActivityText(row, baselineAt) : <span dir="ltr">{lastActivityText(row, baselineAt)}</span>}
              </td>
              <td className={TD_CLASS}>
                <LastAction action={row.lastAction} />
              </td>
              <td className={clsx(TD_CLASS, 'text-[14px]', row.isInactive && 'font-semibold text-tk-weak')}>{row.daysSinceActivity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ActivityUserList;
