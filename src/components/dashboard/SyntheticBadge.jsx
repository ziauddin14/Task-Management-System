import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { SYNTHETIC_LABEL, syntheticDetail } from '../../utils/taskDisplay.js';

// Shown next to a rating that is developer-assigned ("تخمینی"), not real — so the rating is never
// read as an earned one. The task's own completion percent stays where it is, untouched; this only
// says where the RATING came from, and from what assumed percentage.
//
// Hover shows "تخمینی N%" (title); a tap/click expands the badge itself to the same text, since a
// phone has no hover. `static` is for print and exports, where nothing can be hovered or tapped:
// it renders the full text as plain content.
const BADGE_CLASS = 'rounded-full border border-dashed border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium leading-tight text-amber-800';

function SyntheticBadge({ assumedPercent, static: isStatic = false, className }) {
  const [expanded, setExpanded] = useState(false);
  const detail = syntheticDetail(assumedPercent);
  // The same text as `detail`, with the figure kept as one left-to-right unit: straight after an
  // Urdu word the bidi rules would otherwise draw "80%" as "%80", unlike every other percentage in
  // the table beside it.
  const detailNode = (
    <>
      {SYNTHETIC_LABEL} <span dir="ltr">{assumedPercent}%</span>
    </>
  );

  if (isStatic) {
    return <span className={clsx(BADGE_CLASS, className)}>{detailNode}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded((prev) => !prev)}
      title={detail}
      aria-label={`${SYNTHETIC_LABEL} درجہ بندی — فرض کردہ ${assumedPercent}%`}
      aria-expanded={expanded}
      className={clsx(BADGE_CLASS, 'whitespace-nowrap hover:bg-amber-100', className)}
    >
      {expanded ? detailNode : SYNTHETIC_LABEL}
    </button>
  );
}

export default SyntheticBadge;
