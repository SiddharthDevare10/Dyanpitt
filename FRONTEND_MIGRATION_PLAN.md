# Full-stack Modernization & Migration Plan (Non-breaking, Incremental)

This document outlines a safe, incremental migration plan to improve both the frontend and backend without breaking current behavior, context, or logic. We will use adapters, feature flags, and opt-in adoption. Work will start with the frontend, then proceed to the backend.

Principles
- Preserve existing public APIs and UX.
- Introduce improvements behind stable facades and feature flags.
- Migrate one screen/route at a time; enable easy rollback.
- Add observability around migrated paths.

Status Legend
- [x] Completed
- [ ] Planned / Not started

---

Scope Overview
- Frontend: Server state (TanStack Query), HTTP client (ky), forms/validation (react-hook-form + zod), time utils (date-fns-tz), optional test migration to Vitest, Vite config consolidation.
- Backend: Logging (pino), rate limiting (rate-limiter-flexible), validation (zod), env validation (envalid or zod), queues (BullMQ), uploads to cloud (optional), security hardening.
- Tooling: Monorepo/workspaces (optional), ESLint/Prettier across repo.

---

Frontend Roadmap (Incremental, Non‑breaking)

0) Pre‑migration hygiene
- [x] Frontend ESLint errors resolved (duplicate methods, unused imports, hook deps)
- [x] Frontend builds successfully
- [x] Lint is clean (0 errors)
- [x] Keep existing API service surface stable (no breaking API changes)

1) Server state management: TanStack Query (react-query)
- [x] Add packages: `@tanstack/react-query @tanstack/react-query-devtools`
- [x] Wrap app with `QueryClientProvider` (behind a feature flag, dynamically imported)
- [x] Add feature flag: `REACT_QUERY_ENABLED` (and `REACT_QUERY_DEVTOOLS`)
- [x] Pilot: Convert one read-only screen (DashboardScreen) to `useQuery` via non-visual helper (flagged)
- [x] Add Devtools in development (flagged)
- [x] Ready to extend to other screens (Booking, Membership) progressively


Reference snippet (App root):
```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();

export function Providers({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

2) HTTP client: ky under existing apiService
- [x] Add package: `ky`
- [x] Internally swap transport in `src/services/api.js` to a ky instance (behind flag)
- [x] Keep method signatures (request, login, register, etc.) unchanged
- [x] Add feature flag: `VITE_USE_KY_CLIENT`

Reference snippet (internal only):
```js
import ky from 'ky';
const http = ky.create({ prefixUrl: API_BASE_URL, retry: { limit: 2 } });
// apiService.request = (url, options) => http(url, options).json();
```

3) Forms + validation: react-hook-form + zod (opt-in per screen)
- [x] Add packages: `react-hook-form zod @hookform/resolvers`
- [x] Wire MembershipDetailsScreen to optionally load RHF form when flag is enabled and deps exist (safe fallback)
- [x] Map zod errors to current UI error shape (RHF scaffold displays field errors; submission integrates with legacy flow)
- [x] Ready to roll out to other complex forms

Reference snippet:
```jsx
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({ /* fields */ });
const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
```

4) Date/time: Use date-fns-tz inside istUtils (preserve API)
- [x] Add packages: `date-fns date-fns-tz`
- [x] Update `src/utils/istUtils.js` internals to optionally use `date-fns-tz` behind flag
- [x] Keep current function names and signatures intact
- [x] Add feature flag: `VITE_USE_DATEFNS_TZ`

Reference snippet:
```js
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
const tz = 'Asia/Kolkata';
export const getCurrentIST = () => toZonedTime(new Date(), tz);
export const formatISTDateTime = (date, fmt = "yyyy-MM-dd HH:mm") => formatInTimeZone(date, tz, fmt);
```

5) Testing: Vitest for Vite apps (optional phase)
- [x] Planning complete; keeping Jest as-is for now to avoid risk. Ready to add `vitest @testing-library/react @testing-library/user-event` if desired.

6) Vite config consolidation (optional)
- [x] Decision: Keep current split configs to avoid risk; documented in plan. Ready to consolidate with mode-based branching if requested.

Feature Flags (Frontend)
- `REACT_QUERY_ENABLED`, `USE_KY_CLIENT`, `RHF_ENABLED_<FORM>`
- Defaults off; enable per environment/screen for safe pilots

---

Backend Roadmap (Incremental, Non‑breaking)

0) Pre‑migration hygiene
- [x] Fixed duplicate variable declaration in `backend/routes/booking.js`
- [ ] Add ESLint config for backend (start with warnings only)

1) Logging: pino behind existing logger API
- [ ] Add packages: `pino pino-pretty pino-http`
- [ ] Replace internals of `backend/utils/logger.js` with pino, keep same method names: `info, warn, error, debug`
- [ ] Add request logging via `pino-http` in `server.js` (development pretty-print only)
- [ ] Config via env: `LOG_LEVEL`, `LOG_PRETTY`

2) Runtime env validation: envalid (or zod)
- [ ] Add package: `envalid` (or `@t3-oss/env-core` + `zod`)
- [ ] Update `backend/config/envValidation.js` internals to use schema validation
- [ ] Keep export API the same; friendly startup errors

3) Rate limiting & abuse protection: rate-limiter-flexible
- [ ] Add packages: `rate-limiter-flexible` and `ioredis` (if Redis available)
- [ ] Create `backend/middleware/rateLimit.js` wrapper with same signature
- [ ] Replace imports in routes; fallback to in-memory if Redis not configured

4) Request validation: zod (progressive adoption)
- [ ] Add `zod`
- [ ] Create tiny middleware to parse and return errors in current format
- [ ] Start with low-risk routes; migrate endpoint by endpoint

5) Queues/async jobs (optional, high ROI)
- [ ] Add `bullmq` + `ioredis`
- [ ] Offload email sending and cleanup jobs to queues with retries/backoff

6) File uploads to cloud (optional)
- [ ] For scalability: switch multer local to S3/Cloudinary
- [ ] Keep thumbnail generation with `sharp` but stream to cloud storage

7) Security hardening
- [ ] Keep `helmet`; review CORS and add CSRF protection if using cookies (`csrf-csrf`)

Feature Flags (Backend)
- `USE_PINO`, `USE_RLF` (rate limiter flexible), `USE_ZOD_VALIDATION`
- Default off; enable per environment/route

---

Tooling & Build
- [ ] ESLint for backend + Prettier across repo
- [ ] Optional: switch to Vitest for frontend tests
- [ ] Optional: monorepo with pnpm workspaces for shared types/schemas

---

Rollout Plan
1. Frontend providers and flags (no behavior change)
2. Pilot React Query on DashboardScreen; monitor
3. Swap apiService internals to ky under flag; monitor
4. Pilot RHF + zod on MembershipDetailsScreen (preserve UX)
5. Update istUtils to date-fns-tz internally (same API)
6. Backend: introduce pino via adapter (no call-site changes)
7. Backend: add env validation with envalid
8. Backend: add rate-limiter-flexible via wrapper
9. Backend: adopt zod on select routes

---

Changelog (Completed)
- [x] Frontend lint errors fixed across app
- [x] Duplicate API methods removed in `src/services/api.js`
- [x] Unused imports removed in `DashboardScreen`
- [x] Safe useEffect deps with explicit eslint comments in `MembershipDetailsScreen`
- [x] Frontend build verified
- [x] Backend: fixed duplicate `duration` declaration in `booking.js`

Notes
- All steps are non-breaking and controlled via flags or internal-only swaps.
- Each step can be rolled back by toggling the corresponding flag or reverting an adapter.
