import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Plus, Search } from 'lucide-react';
import { useUsers } from '../hooks/useUsers.js';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch.js';
import UserTable from '../components/users/UserTable.jsx';
import UserFormModal from '../components/users/UserFormModal.jsx';
import { PAGE_BUTTON_PRIMARY, PAGE_SUBTITLE, PAGE_TITLE } from '../utils/uiClasses.js';

// docs/08-ui-ux.md §8, docs/09-frontend-features.md §9 — Admin-only Users page: table, search
// (name/email), "+ New User", per-row Edit.
// Prompt 3D — the Lookup Lists panel (components/users/LookupListPanel.jsx) is deliberately not
// rendered here anymore: the Task form's Responsibility dropdown no longer reads from LookupList
// (Prompt 3C), so this panel had no remaining purpose in the UI. The component, its hooks, and the
// underlying LookupList model/API are untouched — only this page stopped mounting it.
function UsersPage() {
  const [searchInput, setSearchInput, debouncedSearch] = useDebouncedSearch('');
  const usersQuery = useUsers({ search: debouncedSearch || undefined });
  const [formModal, setFormModal] = useState(null); // { mode: 'create' } | { mode: 'edit', user }

  // The real numbers, from the list as loaded (a search narrows the list, and these with it).
  const users = usersQuery.data?.items || [];
  const activeCount = users.filter((person) => person.isActive).length;

  // Desktop redesign (approved mockup "5 — صارفین") — the title with a line saying how many users
  // there are, the search box and the "+ نیا صارف" button in one row, then the list.
  return (
    <div className="flex min-w-0 flex-col gap-[14px]">
      <div className="tk-rise flex flex-wrap items-center gap-[14px] text-tk-ink">
        <div className="min-w-0 flex-1">
          <h1 className={PAGE_TITLE}>صارفین</h1>
          {usersQuery.data && (
            <p className={PAGE_SUBTITLE} data-user-count>
              {activeCount} فعال صارفین{users.length > activeCount ? ` — کل ${users.length}` : ''}
            </p>
          )}
        </div>
        <label className="flex h-[48px] w-full items-center gap-2 rounded-tk-btn bg-tk-card px-[14px] shadow-[0_1px_0_var(--tk-line)] focus-within:ring-2 focus-within:ring-tk-green-700 sm:w-[300px]">
          <Search className="h-[18px] w-[18px] shrink-0 text-tk-muted" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="نام یا ای میل تلاش کریں…"
            aria-label="نام یا ای میل تلاش کریں"
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14px] text-tk-ink placeholder:text-tk-muted focus:outline-none"
          />
        </label>
        <button type="button" onClick={() => setFormModal({ mode: 'create' })} className={`${PAGE_BUTTON_PRIMARY} h-[48px]`}>
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
          نیا صارف
        </button>
      </div>

      <UserTable
        users={users}
        isLoading={usersQuery.isLoading}
        isError={usersQuery.isError}
        onEdit={(user) => setFormModal({ mode: 'edit', user })}
      />

      <UserFormModal
        isOpen={Boolean(formModal)}
        mode={formModal?.mode}
        user={formModal?.user}
        onClose={() => setFormModal(null)}
      />
    </div>
  );
}

export default UsersPage;
