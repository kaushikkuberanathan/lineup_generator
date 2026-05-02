# backend/CLAUDE.md

Backend-specific guidance for Claude Code sessions working in the `backend/` directory.
Root project rules (branch strategy, Ship Gate, auth principle, deployment, git discipline) live in `CLAUDE.md` at the repo root.

---

## Commands

```bash
node index.js        # Start Express server (port from PORT in .env; .env.example default: 3000)
npm test             # Run full integration suite (13 suites via test-runner.js; requires server running)
npm run test:auth    # Auth flow tests only
npm run test:admin   # Admin flow tests only
```

---

## Environment Variables

Set in `backend/.env`. See `backend/.env.example` for a template.

| Variable | Notes |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — lives only in backend, never sent to client |
| `ANTHROPIC_API_KEY` | Claude API proxy (`POST /api/ai`) |
| `ADMIN_KEY` | `X-Admin-Key` header for admin and recovery endpoints |
| `RESEND_API_KEY` | Email sending via Resend |
| `APP_URL` | Frontend URL (used in email links) |
| `BACKEND_URL` | This backend's public URL |
| `ADMIN_EMAIL` | Platform admin email (`icoachyouthball@gmail.com`) |
| `RESEND_DOMAIN_VERIFIED` | Set `true` after domain is verified in Resend dashboard |
| `RESEND_TEST_RECIPIENT` | Override recipient for test emails |
| `PORT` | Server port. `.env.example` sets `3000`; code fallback if unset is `5000` |

---

## Routes

Existing routes in `index.js` (do not modify — additive only):
- `GET /health` — health check (async DB connectivity check; 503 on DB failure)
- `GET /ping` — uptime ping (UptimeRobot monitor #802733786, every 5 min)
- `POST /api/ai` — Claude API proxy (`claude-sonnet-4-6`, max 1000 tokens, 25s timeout)

Auth routes (additive only — do not modify existing handlers):
- `POST /api/v1/auth/*` — auth routes (`src/routes/auth.js`)
- `GET/POST /api/v1/admin/*` — admin routes (`src/routes/admin.js`)

---

## Zero-Downtime Constraint (CRITICAL)

Until Phase 4 cutover, all backend changes are **additive only**:
- Do NOT modify existing route handlers in `index.js`
- Do NOT add middleware to existing routes
- Do NOT alter existing tables or columns

---

## Data Protection (CRITICAL)

**NEVER write `roster: []` to a team that already has players without `force: true`.**

Three guards in place:
1. **Postgres trigger** — every write to `team_data` snapshotted in `team_data_history` (last 20 per team). Migration: `backend/migrations/002_team_data_history.sql` — confirmed applied.
2. **Backend write guard** — `POST /api/teams/:teamId/data` returns `409 ROSTER_WIPE_GUARD` if incoming roster is empty and DB row has players. Pass `force: true` to override (logged).
3. **Recovery endpoint** — `GET /api/teams/:teamId/history?limit=5&full=true` (localhost or `X-Admin-Key` header required).

---

## Test Suite

- **Runner**: `backend/scripts/tests/test-runner.js` (custom Node runner, not Vitest)
- **Invocation**: `npm test` from `backend/` — requires local server running on `PORT` and `backend/.env` loaded
- **CI mode**: `CI_SAFE=true` skips suites that write to the database; runs read-only and rejection tests against prod

#### Suites (13)

| Suite | Covers |
|-------|--------|
| `suite-validation.js` | Every endpoint rejects malformed, missing, or malicious input |
| `suite-auth-flow.js` | Happy paths and failure paths for the full auth flow |
| `suite-auth-middleware.js` | `requireAuth` middleware behaviour on protected endpoints |
| `suite-admin.js` | Admin routes reject unauthenticated and non-admin requests |
| `suite-rate-limits.js` | Rate limiting blocks brute-force attempts |
| `suite-idempotency.js` | Duplicates blocked, re-processing handled, state consistency |
| `suite-device-context.js` | Device context captured correctly in access_requests and auth_events |
| `suite-audit-trail.js` | auth_events written for every auth action |
| `suite-contracts.js` | API response shapes — breaking structure changes caught here |
| `suite-data-integrity.js` | Schema constraints enforced correctly |
| `suite-feedback.js` | `POST /api/v1/feedback` |
| `suite-team-data.js` | `POST /api/teams/:teamId/data` and `GET /api/teams/:teamId/history` |
| `suite-regression.js` | Health, ping, lineup generation, AI proxy — no regressions |

---

## Migration Notes

- Canonical migration directory: `backend/src/db/migrations/` only — no new files in `backend/migrations/`
- Two files share the `004_` prefix in different dirs — do not confuse:
  - `backend/src/db/migrations/004_rls_policies.sql` — already applied
  - `backend/migrations/004_rls_fixes.sql` — parked until Phase 4 cutover

---

## Score Reporting Automation

- Microsoft Forms URL pre-fill does not work — confirmed by testing
- Direct backend POST blocked by session CSRF token (`__RequestVerificationToken` + `FormsWebSessionId` cookie)
- Chosen approach: n8n webhook orchestration (GET token → POST submission)
- All field IDs and endpoint documented in `docs/product/ROADMAP.md` under Backlog → Automated Score Reporting
- Power Automate webhook (county-side) documented as long-term fallback
- Schema migration needed: split `location` field into `parkName` + `fieldNumber` before implementation
