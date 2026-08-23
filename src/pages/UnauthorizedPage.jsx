import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { useNavigate } from 'react-router-dom';

// docs/08-ui-ux.md §11 — minimal, on-brand: short Urdu message + a button back to the Dashboard,
// no dead ends.
function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold">Unauthorized</h1>
      <p className="text-gray-600">Aap ko is safhe tak rasai nahi hai.</p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="h-10 min-w-[40px] rounded-lg bg-brand px-4 text-white hover:bg-brand/90"
      >
        Dashboard par jayein
      </button>
    </div>
  );
}

export default UnauthorizedPage;
