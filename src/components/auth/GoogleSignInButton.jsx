import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

/**
 * docs/11-auth.md §2.2. Takes the login mutation as a prop rather than calling
 * useLoginWithGoogle() itself, so LoginPage.jsx (the parent) can read the SAME mutation's
 * isError/error state to show the inline failure message required by §2.3 — calling the hook
 * separately in each component would create two independent mutation instances that don't share
 * state. The onSuccess call shape here still matches the doc's example exactly
 * (`loginMutation.mutate({ idToken: credentialResponse.credential })`).
 *
 * useOneTap + the standard button always render together (progressive enhancement — One Tap can
 * be dismissed or blocked, so it must never be the only path in, per §2.2).
 */
function GoogleSignInButton({ loginMutation, onGoogleError }) {
  return (
    <GoogleLogin
      useOneTap
      onSuccess={(credentialResponse) => loginMutation.mutate({ idToken: credentialResponse.credential })}
      onError={() => {
        toast.error('Login mumkin nahi hua, dobara koshish karein');
        // docs/08-ui-ux.md §2 step 5 — the generic message must show inline on this screen too,
        // not just as a toast (Google's own client-side sign-in failure never reaches
        // loginMutation, which only tracks OUR backend call — so LoginPage needs its own signal).
        onGoogleError?.();
      }}
    />
  );
}

export default GoogleSignInButton;
