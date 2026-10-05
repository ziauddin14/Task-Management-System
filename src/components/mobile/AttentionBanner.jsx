import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

// The amber "N کام تاخیر کا شکار ہیں" line under the hero card. `count` is the number of tasks in
// the "پینڈنگ" status — the status the backend moves an unfinished task into the moment its
// deadline passes (reminder-engine.service.js), i.e. exactly the tasks that are late. It links to
// the task list filtered to them. Nothing is shown while there are none.
function AttentionBanner({ count, to }) {
  if (!count || count <= 0) return null;

  return (
    <Link
      to={to}
      className="flex min-h-[64px] items-center gap-tk-gap rounded-tk-tile bg-tk-attention-bg px-tk-card py-[10px] text-tk-attention-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-attention-icon"
    >
      <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-tk-chip bg-tk-attention-chip">
        <Clock className="h-[22px] w-[22px] text-tk-attention-icon" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-[15px] font-semibold leading-tk-title">
        {count} {count === 1 ? 'کام تاخیر کا شکار ہے' : 'کام تاخیر کا شکار ہیں'}
      </span>
      <span className="shrink-0 text-[13px] font-semibold leading-tk-title">
        دیکھیں <span aria-hidden="true">‹</span>
      </span>
    </Link>
  );
}

export default AttentionBanner;
