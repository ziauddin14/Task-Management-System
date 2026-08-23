import React, { StrictMode } from 'react'; // explicit import — see src/App.jsx's comment for why
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import './styles/fonts.css';
import './styles/print.css';
import './index.css';

// docs/11-auth.md §2.1 — wraps the whole app.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);
