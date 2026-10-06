import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { useCountUp } from '../../hooks/useCountUp.js';

// A figure that counts up to its value (hooks/useCountUp.js). Kept left-to-right so "62.4%" never
// reads "%62.4" inside the right-to-left page. Whatever names the control this sits in (a tile's
// or a legend row's aria-label) states the real value, so the ticking is for the eye only.
function CountUp({ value, suffix = '', className }) {
  const shown = useCountUp(value);

  return (
    <span className={className} dir="ltr">
      {shown}
      {suffix}
    </span>
  );
}

export default CountUp;
