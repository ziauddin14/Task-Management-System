import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Plus } from 'lucide-react';
import { useUsers } from '../hooks/useUsers.js';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch.js';
import UserTable from '../components/users/UserTable.jsx';
import UserFormModal from '../components/users/UserFormModal.jsx';

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">صارفین</h1>
        <button
          type="button"
          onClick={() => setFormModal({ mode: 'create' })}
          className="flex h-10 items-center gap-1 rounded-lg bg-brand px-4 text-white hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          نیا صارف
        </button>
      </div>

      <input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Naam ya email talaash karein…"
        aria-label="Naam ya email talaash karein"
        className="h-10 w-full max-w-sm rounded-lg border border-gray-300 px-3 focus:border-brand focus:outline-none"
      />

      <UserTable
        users={usersQuery.data?.items || []}
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
