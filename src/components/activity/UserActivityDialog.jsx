import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Activity } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Pagination from '../common/Pagination.jsx';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useUserActivityEvents } from '../../hooks/useUserActivityEvents.js';
import { useUserActivityHistory } from '../../hooks/useUserActivityHistory.js';
import { PAGE_SIZE_OPTIONS } from '../../hooks/usePageSize.js';
import { FIELD, FIELD_LABEL } from '../../utils/uiClasses.js';
import { formatKarachiDateTime } from '../../utils/karachiTime.js';
import { ACTIVITY_TYPES, activityTypeLabel, deviceLabel } from '../../utils/activityLog.js';

const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
const ROW_CLASS = 'flex flex-wrap items-baseline gap-x-3 gap-y-[2px] border-t border-tk-line-row py-[10px] first:border-t-0';

// One line of the timeline: what was done (and on which task), when — in Pakistan time — and on
// what kind of device.
function EventRow({ event }) {
  const device = deviceLabel(event.device);
  return (
    <li className={ROW_CLASS} data-event-type={event.type}>
      <span className="min-w-0 flex-1 text-[14px] font-semibold leading-tk-title">
        {activityTypeLabel(event.type)}
        {event.taskCode && (
          <>
            {' · '}
            <span dir="ltr">{event.taskCode}</span>
          </>
        )}
      </span>
      <span dir="ltr" className="shrink-0 text-[13px] text-tk-ink-soft">
        {formatKarachiDateTime(event.at)}
      </span>
      {device && (
        <span dir="ltr" className="w-full text-end text-[12px] text-tk-muted">
          {device}
        </span>
      )}
    </li>
  );
}

// The person's task updates from before the activity log began — read from the task updates
// themselves, shown here only, never counted towards "inactive". When, which task, what percent;
// never the update's text. Shown only when there is anything to show (and hidden if it fails).
function HistorySection({ userId }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const historyQuery = useUserActivityHistory(userId, { page, limit: pageSize });
  const items = historyQuery.data?.items || [];
  const meta = historyQuery.data?.meta;

  if (!meta || meta.total === 0) return null;

  return (
    <section data-history-section aria-label="ایکٹیویٹی لاگ سے پہلے کی اپڈیٹس" className="mt-5 rounded-tk-tile bg-tk-surface px-4 py-3">
      <h3 className="text-[15px] font-semibold leading-tk-title text-tk-ink">ایکٹیویٹی لاگ سے پہلے کی اپڈیٹس</h3>
      <ul className="mt-1">
        {items.map((item) => (
          <li key={item.id} className={ROW_CLASS}>
            <span className="min-w-0 flex-1 text-[14px] leading-tk-title">
              {activityTypeLabel('TASK_UPDATE_CREATED')}
              {item.taskCode && (
                <>
                  {' · '}
                  <span dir="ltr">{item.taskCode}</span>
                </>
              )}
              {' · '}
              <span dir="ltr">{item.completionPercent}%</span>
            </span>
            <span dir="ltr" className="shrink-0 text-[13px] text-tk-ink-soft">
              {formatKarachiDateTime(item.at)}
            </span>
          </li>
        ))}
      </ul>
      {meta.total > DEFAULT_PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </section>
  );
}

// The activity log's timeline dialog for one person: their recorded events, newest first, with a
// type filter and a from/to date range (whole Pakistan days), paginated; below them, the read-only
// section of their task updates from before the log began.
function UserActivityDialog({ user, onClose }) {
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const userId = user?.id;

  // A different person starts from a clean slate.
  useEffect(() => {
    setType('');
    setFrom('');
    setTo('');
    setPage(1);
  }, [userId]);

  const eventsQuery = useUserActivityEvents(userId, {
    type: type || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit: pageSize,
  });
  const events = eventsQuery.data?.items || [];
  const meta = eventsQuery.data?.meta;

  function changeFilter(setter) {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  return (
    <Modal
      isOpen={Boolean(user)}
      onClose={onClose}
      variant="redesign"
      icon={Activity}
      title={user ? `${user.name} — ایکٹیویٹی` : ''}
      subtitle={user?.responsibility}
      maxWidthClassName="max-w-2xl"
    >
      {/* The type filter's own first choice ("تمام ایکٹیویٹیز") names it; the two dates are labelled. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end" data-timeline-filters>
        <label className="min-w-0">
          <select value={type} onChange={changeFilter(setType)} className={FIELD} aria-label="تمام ایکٹیویٹیز">
            <option value="">تمام ایکٹیویٹیز</option>
            {ACTIVITY_TYPES.map((key) => (
              <option key={key} value={key}>
                {activityTypeLabel(key)}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className={FIELD_LABEL}>از تاریخ</span>
          <input type="date" value={from} max={to || undefined} onChange={changeFilter(setFrom)} className={FIELD} dir="ltr" />
        </label>
        <label className="min-w-0">
          <span className={FIELD_LABEL}>تا تاریخ</span>
          <input type="date" value={to} min={from || undefined} onChange={changeFilter(setTo)} className={FIELD} dir="ltr" />
        </label>
      </div>

      <div className="mt-3" aria-busy={eventsQuery.isFetching || undefined}>
        {eventsQuery.isLoading && <LoadingPhrase label="سرگزشت لوڈ ہو رہی ہے…" />}
        {!eventsQuery.isLoading && eventsQuery.isError && <EmptyState message="سرگزشت لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" />}
        {!eventsQuery.isLoading && !eventsQuery.isError && events.length === 0 && <EmptyState message="اس مدت میں کوئی ایکٹیویٹی نہیں" />}
        {events.length > 0 && !eventsQuery.isError && (
          <ul data-timeline>
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
        {meta && meta.total > DEFAULT_PAGE_SIZE && !eventsQuery.isError && (
          <Pagination
            page={page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>

      {userId && <HistorySection key={userId} userId={userId} />}
    </Modal>
  );
}

export default UserActivityDialog;
