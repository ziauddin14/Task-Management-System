import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { useLoginWithGoogle } from '../hooks/useLoginWithGoogle.js';
import GoogleSignInButton from '../components/auth/GoogleSignInButton.jsx';

// Real Google Sign-In wiring (docs/11-auth.md §2). Full visual/branding content (system name,
// department name, salutation line — docs/08-ui-ux.md §2) is explicitly out of scope for this
// sub-phase and deliberately not implemented here; only the functional pieces this sub-phase
// owns: the sign-in button and the inline failure message required by §2.3.
function LoginPage() {
  const loginMutation = useLoginWithGoogle();

  return (
    <div>
      <h1>Login</h1>
      <GoogleSignInButton loginMutation={loginMutation} />
      {loginMutation.isError && <p role="alert">{loginMutation.error.message}</p>}
    </div>
  );
}

export default LoginPage;
