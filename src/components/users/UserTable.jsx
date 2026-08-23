import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import Spinner from '../common/Spinner.jsx';
import EmptyState from '../common/EmptyState.jsx';

// docs/08-ui-ux.md §8 — Name, Email, Responsibility, Role, Status (Active/Inactive), per-row Edit
// action. No delete action anywhere on this page.
function UserTable({ users, isLoading, isError, onEdit }) {
  if (isLoading) return <Spinner label="Users load ho rahe hain..." />;
  if (isError) return <EmptyState message="Users load nahi ho sake. Dobara koshish karein." />;
  if (users.length === 0) return <EmptyState message="Koi user is talaash se mutabiq nahi mila." />;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-start text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Naam</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Email</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Zimmedari</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Role</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Status</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-gray-100">
              <td className="whitespace-nowrap px-3 py-2">{user.name}</td>
              <td className="whitespace-nowrap px-3 py-2">{user.email}</td>
              <td className="whitespace-nowrap px-3 py-2">{user.responsibility}</td>
              <td className="whitespace-nowrap px-3 py-2 capitalize">{user.role}</td>
              <td className="whitespace-nowrap px-3 py-2">
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                  )}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <button
                  type="button"
                  onClick={() => onEdit(user)}
                  className="h-10 min-w-[40px] rounded-lg border border-gray-300 px-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Edit
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
