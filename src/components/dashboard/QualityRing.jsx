import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import CountUp from '../common/CountUp.jsx';
import { RATING_TONE } from '../../utils/mobileTheme.js';
import { arcLength } from '../../utils/ratingSummary.js';

// The average as a ring: the filled arc is the average percent, in the band's colour. The figure
// itself is written in the middle, so the ring is never the only way to read it.
//
// One component for both layouts. The defaults are the mobile hero's ring (92px); the desktop hero
// asks for a larger one and for `animated` — the arc then draws itself in and the figure counts up
// (both only where motion is allowed; see styles/tokens.css and hooks/useCountUp.js).
function QualityRing({ percent, band, size = 92, radius = 38, strokeWidth = 10, labelClassName = 'text-[17px]', animated = false }) {
  const { filled, circumference } = arcLength(percent, radius);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`اوسط ${percent} فیصد`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-tk-track" />
        <circle
          data-ring-arc
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={clsx(RATING_TONE[band]?.stroke, animated && 'tk-arc-draw')}
          style={animated ? { '--tk-arc-c': circumference } : undefined}
        />
      </svg>
      <span className={clsx('absolute inset-0 flex items-center justify-center font-semibold text-tk-ink', labelClassName)} dir="ltr" aria-hidden="true">
        {animated ? <CountUp value={percent} suffix="%" /> : `${percent}%`}
      </span>
    </div>
  );
}

export default QualityRing;
