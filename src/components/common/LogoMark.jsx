import React from 'react'; // explicit import — see src/App.jsx's comment for why

// Prompt 5D — placeholder brand mark (docs/01-architecture.md's client-responsibility item: no
// official Dawat-e-Islami asset exists yet). Deliberately simple and geometric — a rounded-square
// badge in the brand green (#1F6F3F) with a checkmark, reading as "a task, done" rather than
// anything elaborate. Swap this file's contents for the real asset when it arrives; every caller
// (Sidebar.jsx, AppLayout.jsx) just renders <LogoMark />, so nothing else needs to change.
function LogoMark({ className = 'h-8 w-8', decorative = true }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : 'ٹاسک مینجمنٹ سسٹم'}
    >
      <rect x="2" y="2" width="36" height="36" rx="11" fill="#1F6F3F" />
      <path
        d="M12 20.5L17.5 26L28 14"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default LogoMark;
