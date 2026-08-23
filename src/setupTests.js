import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

// Global mock for @react-oauth/google — no test in this suite ever needs the real Google SDK
// (no real popup/One Tap is possible in jsdom anyway). Centralized here (applies to every test
// file via vite.config.js's setupFiles) rather than repeated per file, since the mock shape is
// identical everywhere it's needed: GoogleOAuthProvider is a passthrough, and GoogleLogin exposes
// two buttons a test can click to simulate a successful or failed credential response.
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => children,
  GoogleLogin: ({ onSuccess, onError }) =>
    React.createElement(
      'div',
      null,
      React.createElement(
        'button',
        { type: 'button', onClick: () => onSuccess({ credential: 'fake-google-id-token' }) },
        'Mock Google Sign-In'
      ),
      React.createElement('button', { type: 'button', onClick: () => onError() }, 'Mock Google Error')
    ),
}));
