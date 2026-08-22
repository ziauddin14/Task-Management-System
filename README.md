# Task Management System — Frontend

React (Vite) SPA for the Khud Kifalat Shobajat (Dawat-e-Islami) Task Management System.

> Status: **Phase 10.1 — Frontend Foundation only.** Project skeleton, routing guards, authStore,
> and apiClient exist. No real screens, no Google Sign-In, no API wiring beyond the client itself.
> See `../docs/07-frontend-foundation.md` for the full specification this sub-phase follows.

Fully independent from `../backend/` — its own `package.json`, own `.env`, own deployment. No
import ever crosses between the two projects; all communication is over HTTP via `apiClient.js`.

## Local setup

```bash
cd frontend
npm install
cp .env.example .env   # then set VITE_API_BASE_URL to your running backend
npm run dev
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Production build (fails the build on any error — verified every phase). |
| `npm run preview` | Preview the production build locally. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run lint` | Run ESLint. |
| `npm run format` | Run Prettier (writes changes). |

## Known gap (carried forward)

The actual Jameel Noori Nastaleeq `.woff2` font file has never been provided by the client (first
flagged in the backend's Phase 8 report). `src/styles/fonts.css` already declares the `@font-face`
rule at the expected path (`src/assets/fonts/JameelNooriNastaleeq.woff2`) — dropping the real file
in later requires zero code changes. Until then, the documented fallback stack (Noto Nastaliq
Urdu, Noto Sans Arabic, sans-serif) renders instead.

## Layering

```
routes/AppRoutes.jsx → pages/ → components/ (feature-grouped) → services/apiClient.js → backend
```

`store/authStore.js` (Zustand) is the *only* global client state (session only). Everything else
is server state owned by React Query — see `docs/07-frontend-foundation.md` §4.
