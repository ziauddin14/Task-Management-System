import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { SMALL_BUTTON_GHOST } from '../../utils/uiClasses.js';

const CHIP_CLASS = 'inline-flex items-center gap-[6px] whitespace-nowrap rounded-tk-pill px-3 text-[13px] leading-[2.3]';
const TH_CLASS = 'whitespace-nowrap px-5 py-[10px] text-start text-[12.5px] font-semibold';
const TD_CLASS = 'px-5 py-[8px] align-middle';

// The avatar: a circle with the person's initial. The letter is drawn from data-initial
// (styles/tokens.css), so the name beside it stays the only text naming the person.
function Avatar({ name, className }) {
  return (
    <span
      aria-hidden="true"
      data-initial={(name || '').trim().charAt(0)}
      className={clsx('tk-initial flex shrink-0 items-center justify-center rounded-full bg-tk-green-50 font-semibold text-tk-green-900', className)}
    />
  );
}

// "User" in a blue tint, "Admin" in a green one. The text is the role value itself, as before.
function RoleChip({ role }) {
  return <span className={clsx(CHIP_CLASS, 'capitalize', role === 'admin' ? 'bg-tk-closed-tint text-tk-closed-ink' : 'bg-tk-ongoing-tint text-tk-ongoing-text')}>{role}</span>;
}

// فعال (green, with a dot) or غیر فعال (grey).
function StatusChip({ isActive }) {
  return (
    <span className={clsx(CHIP_CLASS, isActive ? 'bg-tk-closed-tint text-tk-closed-ink' : 'bg-tk-track text-tk-ink-soft')}>
      <span aria-hidden="true" className={clsx('h-[7px] w-[7px] rounded-full', isActive ? 'bg-tk-green-700' : 'bg-tk-muted')} />
      {isActive ? 'فعال' : 'غیر فعال'}
    </span>
  );
}

// docs/08-ui-ux.md §8 — the users list: name, ذمہ داری, email, role, status and the edit action.
// Desktop redesign (approved mockup "5 — صارفین"): a white rounded card with a light header row;
// every column is still there. Below 768px each user is a stacked card instead of a table row —
// the same six pieces of information, labelled, so nothing needs sideways scrolling.
function UserTable({ users, isLoading, isError, onEdit }) {
  const isMobile = useIsMobile();

  if (isLoading) return <LoadingPhrase label="صارفین لوڈ ہو رہے ہیں…" />;
  if (isError) return <EmptyState message="صارفین لوڈ نہیں ہو سکے۔ دوبارہ کوشش کریں۔" />;
  if (users.length === 0) return <EmptyState message="اس تلاش سے مطابقت رکھنے والا کوئی صارف نہیں ملا۔" />;

  if (isMobile) {
    return (
      <ul className="flex flex-col gap-tk-gap" data-user-cards>
        {users.map((user) => (
          <li key={user.id} className="flex flex-col gap-[6px] rounded-tk-card bg-tk-card p-tk-card text-tk-ink shadow-tk-soft">
            <div className="flex items-center gap-[10px]">
              <Avatar name={user.name} className="h-[40px] w-[40px] text-[15px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-tk-label">{user.name}</p>
                <p className="truncate text-[13px] leading-tk-label text-tk-ink-soft">{user.responsibility}</p>
              </div>
            </div>
            <p dir="ltr" className="break-all text-right text-[13px] text-tk-muted">
              {user.email}
            </p>
            <div className="flex flex-wrap items-center gap-tk-gap-sm">
              <RoleChip role={user.role} />
              <StatusChip isActive={user.isActive} />
              <span className="min-w-0 flex-1" />
              <button type="button" onClick={() => onEdit(user)} className={clsx(SMALL_BUTTON_GHOST, 'h-tk-touch')}>
                ترمیم کریں
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="tk-rise tk-d1 overflow-x-auto rounded-tk-panel bg-tk-card text-tk-ink shadow-tk-card">
      <table className="w-full text-start text-[13px]">
        <thead className="bg-tk-surface text-tk-muted">
          <tr>
            <th className={TH_CLASS}>نام</th>
            <th className={TH_CLASS}>ذمہ داری</th>
            <th className={TH_CLASS}>ای میل</th>
            <th className={TH_CLASS}>کردار</th>
            <th className={TH_CLASS}>کیفیت</th>
            <th className={TH_CLASS}>اقدامات</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-tk-line-row transition-colors hover:bg-tk-hover motion-reduce:transition-none">
              <td className={TD_CLASS}>
                <div className="flex items-center gap-[10px]">
                  <Avatar name={user.name} className="h-[36px] w-[36px] text-[14px]" />
                  <span className="whitespace-nowrap text-[14px] font-semibold leading-tk-title">{user.name}</span>
                </div>
              </td>
              <td className={clsx(TD_CLASS, 'leading-tk-title')}>{user.responsibility}</td>
              <td dir="ltr" className={clsx(TD_CLASS, 'whitespace-nowrap text-right text-[12.5px] text-tk-muted')}>
                {user.email}
              </td>
              <td className={TD_CLASS}>
                <RoleChip role={user.role} />
              </td>
              <td className={TD_CLASS}>
                <StatusChip isActive={user.isActive} />
              </td>
              <td className={TD_CLASS}>
                <button type="button" onClick={() => onEdit(user)} className={SMALL_BUTTON_GHOST}>
                  ترمیم کریں
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserTable;
