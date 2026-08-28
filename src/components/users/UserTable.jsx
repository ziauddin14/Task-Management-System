import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import Spinner from '../common/Spinner.jsx';
import EmptyState from '../common/EmptyState.jsx';

// Prompt 3E — Name, Zimmedari (Responsibility), Email, Role, Status (Active/Inactive), per-row
// Edit action, in this exact right-to-left order. No delete action anywhere on this page.
function UserTable({ users, isLoading, isError, onEdit }) {
  if (isLoading) return <Spinner label="صارفین لوڈ ہو رہے ہیں…" />;
  if (isError) return <EmptyState message="صارفین لوڈ نہیں ہو سکے۔ دوبارہ کوشش کریں۔" />;
  if (users.length === 0) return <EmptyState message="اس تلاش سے مطابقت رکھنے والا کوئی صارف نہیں ملا۔" />;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-start text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="whitespace-nowrap px-3 py-2 font-medium">نام</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">ذمہ داری</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">ای میل</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">کردار</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">کیفیت</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">اقدامات</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-gray-100 hover:bg-brand-light/40">
              <td className="whitespace-nowrap px-3 py-2">{user.name}</td>
              <td className="whitespace-nowrap px-3 py-2">{user.responsibility}</td>
              <td className="whitespace-nowrap px-3 py-2">{user.email}</td>
              <td className="whitespace-nowrap px-3 py-2 capitalize">{user.role}</td>
              <td className="whitespace-nowrap px-3 py-2">
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                  )}
                >
                  {user.isActive ? 'فعال' : 'غیر فعال'}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <button
                  type="button"
                  onClick={() => onEdit(user)}
                  className="h-10 min-w-[40px] rounded-lg border border-gray-300 px-2 text-xs text-gray-700 hover:bg-gray-50"
                >
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
