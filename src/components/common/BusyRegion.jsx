import React from 'react'; // explicit import — see src/App.jsx's comment for why
import LoadingPhrase from './LoadingPhrase.jsx';
import { BusyRegionContext, useBusyRegionState } from '../../contexts/BusyRegionContext.js';

// Wraps a row of buttons that is NOT inside a Modal (a Modal is already a region of its own).
// While any BusyButton inside it is busy, the one-line loading phrase appears directly after the
// wrapped content — i.e. under the button row, across the full width of whatever holds that row.
// It adds no element of its own while idle, and nothing is reserved for the line: it takes its
// space only while busy, below the buttons, so the buttons themselves never move.
// `lineClassName` styles the line's own box (its spacing from the row; negative side margins where
// a narrow container's padding should be given to the phrase).
function BusyRegion({ children, lineClassName = 'mt-1' }) {
  const region = useBusyRegionState();

  return (
    <BusyRegionContext.Provider value={region.report}>
      {children}
      {region.isBusy && (
        <div className={lineClassName}>
          <LoadingPhrase size="compact" label={region.label} />
        </div>
      )}
    </BusyRegionContext.Provider>
  );
}

export default BusyRegion;
