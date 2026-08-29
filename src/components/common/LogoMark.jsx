import React from 'react'; // explicit import — see src/App.jsx's comment for why
import logoUrl from '../../assets/logo/images.png';

// Real Dawat-e-Islami brand mark (assets/logo/images.png) — replaces the earlier geometric
// placeholder now that the client has actually provided the asset (docs/01-architecture.md's
// client-responsibility item, previously unmet — see assets/logo/README.md). Every caller
// (AppLayout.jsx's navbar, Sidebar.jsx's header) already just renders <LogoMark />, so swapping
// the placeholder for the real file needed no changes anywhere else. object-contain + an explicit
// className-driven box size keeps the (square, 300x300) source crisp and unstretched at every
// size it's used at, from the collapsed sidebar rail up to the login page's larger mark.
function LogoMark({ className = 'h-8 w-8', decorative = true }) {
  return (
    <img
      src={logoUrl}
      alt={decorative ? '' : 'ٹاسک مینجمنٹ سسٹم'}
      aria-hidden={decorative || undefined}
      className={`${className} shrink-0 object-contain`}
    />
  );
}

export default LogoMark;
