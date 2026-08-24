import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { useLoginWithGoogle } from '../hooks/useLoginWithGoogle.js';
import GoogleSignInButton from '../components/auth/GoogleSignInButton.jsx';

// docs/08-ui-ux.md §2 — centered, single-column, mobile-first: system name, Urdu department name,
// a fixed salutation line, the Google Sign-In button (the only interactive element), and an
// inline error area below it showing the exact failure reason for any of the three documented
// cases — never a silent failure or a browser-default error page.
function LoginPage() {
  const loginMutation = useLoginWithGoogle();
  const [googleError, setGoogleError] = useState(null);

  // Either failure source clears once a fresh attempt starts (RHF-less here, so tracked by hand):
  // a backend rejection (USER_NOT_FOUND/USER_INACTIVE/INVALID_TOKEN, loginMutation.error.message
  // — rendered verbatim, already Urdu-appropriate per the backend's own response text) takes
  // precedence display-wise since it's the more specific of the two when both could be stale.
  const errorMessage = loginMutation.isError ? loginMutation.error.message : googleError;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4 py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        {/* Logo placeholder — reserved above the title until official Dawat-e-Islami branding
            assets arrive (docs/07-frontend-foundation.md §8's client-responsibility item). */}
        <div className="h-16 w-16 rounded-full bg-brand-light" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-brand">ٹاسک مینیجمینٹ سسٹم</h1>
        <p className="text-lg text-brand">خود کفالت شعبہ جات (دعوتِ اسلامی)</p>
        <p className="text-base text-gray-600">صلوٰۃ علی الحبیب ﷺ</p>
      </div>

      <GoogleSignInButton
        loginMutation={loginMutation}
        onGoogleError={() => setGoogleError('لاگ ان ممکن نہیں ہوا، دوبارہ کوشش کریں')}
      />

      {errorMessage && (
        <p role="alert" className="max-w-xs text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default LoginPage;
