# backend/CLAUDE.md

Backend-specific guidance for Claude Code sessions working in the `backend/` directory.
Root project rules (branch strategy, Ship Gate, auth principle, deployment, git discipline) live in `CLAUDE.md` at the repo root.

---

## Commands

```bash
node index.js        # Start Express server (5-line boot; requires ./app.js). Port from PORT in .env; .env.example default: 3000
npm test             # Integration suite (13 suites via test-runner.js; requires a running server + .env)
npm run test:unit    # In-process unit tests (node:test + supertest, src/__tests__/*.test.js; no server, no live DB)
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

**Entry point:** `index.js` is a 5-line boot that does `require('./app')` and `listen()`. The Express app — middleware, root routes, router mounts, and the error handler — lives in **`app.js`** (split out in Story 99 so the app is import-safe for supertest; `node index.js` boot behavior is unchanged). Handlers live in `src/routes/`.

Root routes (in `app.js` — additive only, do not modify):
- `GET /health` — health check (async DB connectivity check; 503 on DB failure)
- `GET /ping` — uptime ping (UptimeRobot monitor #802733786, every 5 min)
- `POST /api/ai` — Claude API proxy (`claude-sonnet-4-6`, max 1000 tokens, 30s timeout)
- `POST /generate-lineup` — shuffle helper

Router mounts (in `app.js`):
- `/api/v1/auth` → `src/routes/auth.js`
- `/api/v1/ops` → `src/routes/ops.js`
- `/api/v1/teams` (+ legacy `/api/teams`) → `src/routes/teamData.js`
- `/api/v1` → `src/routes/feedback.js` **and** `src/routes/admin.js`, **feedback mounted first — order matters, see warning below**

**⚠️ Admin route paths are NOT under `/api/v1/admin/`.** admin.js mounts bare at `/api/v1`, so its protected handlers are `/api/v1/requests`, `/api/v1/members`, `/api/v1/approve`, `/api/v1/reject`, `/api/v1/update-role` (POST), `/api/v1/reset-access`, `/api/v1/suspend`. Only the two public 1-tap email links carry `/admin`: `GET /api/v1/admin/approve-link`, `GET /api/v1/admin/deny-link`. A router-level `router.use(requireAuth, requireAdmin)` (admin.js:172) sits **after** the public links and **before** the protected handlers; it is path/method-agnostic, so it 401s any unmatched path under the router too. (This is why the legacy `suite-admin.js` "passed" against non-existent `/api/v1/admin/*` paths — it hit the catch-all, not the real routes. See Story 99.)

**⚠️ `feedbackRouter` MUST mount before `adminRouter`.** Both share the `/api/v1` base. Because admin.js's `requireAuth`+`requireAdmin` gate is path-agnostic (previous paragraph), mounting `adminRouter` first meant every `POST /api/v1/feedback` hit that gate before ever reaching feedback.js's own route — every non-admin coach's feedback submission returned 403. Found and fixed 2026-07-31 while writing `feedback.test.js` (FB-7 is the regression guard). If a third router is ever added under the bare `/api/v1` base, mount it before `adminRouter` too, or give it its own path prefix.

---

## Zero-Downtime Constraint (CRITICAL)

Until Phase 4 cutover, all backend changes are **additive only**:
- Do NOT modify existing route handlers in `app.js` or `src/routes/`
- Do NOT add middleware to existing routes
- Do NOT alter existing tables or columns

The Story 99 app/server split (extracting `app.js` out of `index.js`) is the one sanctioned exception — it relocated existing handlers verbatim with no behavior change, boot-verified (same `/ping`, `/`, and startup log line). "Additive only" still governs the handlers in their new home.

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
| `suite-regression.js` | Health, ping, lineup generation, AI proxy type validation (REG-05/06) — no regressions |

#### Unit suite (in-process, Story 99 — #252)

A second, hermetic test system runs alongside the integration runner:

- **Invocation**: `npm run test:unit` (`node --test src/__tests__/*.test.js`) — node:test + supertest, **no running server, no live DB**.
- **How**: imports the Express app via `require('./app')` (enabled by the app/server split) and drives it with `request(app)` — no port bound.
- **Env**: still needs `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` set, because `src/lib/env.js` + `src/lib/supabase.js` throw at import. Tests never make a real Supabase or network call — they either short-circuit before the client (auth-rejection in `requireAuth.js`) or monkey-patch the seams (`supabaseAdmin.from` / `supabaseAdmin.rpc` / `supabaseAnon.auth.signInWithOtp` / `global.fetch`). `supabaseAdmin` is a shared singleton, so patching `.from` also intercepts `logAuthEvent`'s `auth_events` write. Dummy non-empty values work anywhere.
- **File convention**: specs live in `src/__tests__/*.test.js` (the `test:unit` glob) — use this path, **not** `src/tests/`.

Unit suite total: **111** (verified via `npm run test:unit`, 2026-07-31 — 0 fail / 0 skipped). Story 99 closed this date; see ROADMAP.md Story 99 for the closure writeup and the new follow-up story for admin.js's remaining success-path gap.

| Spec | Covers |
|------|--------|
| `admin.auth.test.js` (9) | Admin routes reject no-token requests with **401** at their real bare `/api/v1/*` paths (requests/members/approve/reject/update-role/reset-access/suspend); public `/api/v1/admin/{approve,deny}-link` return 400, never 401. Closes the legacy "green-but-vacuous" gap. Rejection-path only — see the follow-up story for authorized-action coverage. |
| `teamData.guard.test.js` (12) | `rosterWipeGuard` unit suite + `isAdminRequest` truth table — direct unit tests (the route-level 403 is unreachable in-process; see `teamData.routes.test.js` header). |
| `teamData.envGuard.test.js` (2) | Production-mode `FORBIDDEN_TEST_DATA` rejection for test team IDs on POST + GET. |
| `teamData.routes.test.js` (6) | Route-level `POST/GET /api/v1/teams/:id` (+ legacy `/api/teams`): 409 wipe-guard, `force` override, dual-mount smoke, DB-error 500, history limit clamp. `supabaseAdmin.from`/`.rpc` monkey-patched. |
| `aiProxy.test.js` (6) | `POST /api/ai`: 503 unconfigured, **413 oversize (v2.2.4 regression guard)**, 400 bad type, 200 upstream status/body relay + call-shape (`claude-sonnet-4-6`, max_tokens, content), 504 AbortError, 502 unreachable. `global.fetch` stubbed; `ANTHROPIC_API_KEY` save/restore. |
| `auth.happy.test.js` (4) | `POST /request-access` 201/409 + `POST /magic-link` 200/403. Hermetic via shared-`supabaseAdmin` patch (also covers `logAuthEvent`), `signInWithOtp` stub, and `global.fetch` stub for the Resend send. |
| `approve.role.test.js` (6) | `POST /api/v1/approve` role-transition behavior. Landed between Phase 2 tranche 2 and Story 99's closure without a doc update — backfilled here 2026-07-31. |
| `approveLink.role.test.js` (7) | `GET /api/v1/admin/approve-link` role-transition behavior (the public 1-tap email link). Backfilled 2026-07-31 — see note above. |
| `requestAccess.role.test.js` (7) | `POST /api/v1/request-access` role validation. Backfilled 2026-07-31 — see note above. |
| `normalizeRole.test.js` (13) | `normalizeRole()` — the code-level enforcement of the four-role model documented in root `CLAUDE.md` → Multi-team design. Backfilled 2026-07-31 — see note above. |
| `loginLimiter.test.js` (3) | **NEW 2026-07-31.** `loginLimiter` (auth.js) keyed by email, not IP — Story 26 fix. Same email exhausts its own budget (429 on the 6th attempt); a different email is unaffected by another's exhausted budget (the actual bug); no-email requests are exempt via `skip()`. RED→GREEN mutation-verified. |
| `auth.session.test.js` (8) | **NEW 2026-07-31.** `GET /me`, `PATCH /me`, `POST /logout` — zero prior coverage. Hydrated-user happy path, missing-profile non-crash, validation and not-found paths, and 401 rejection for all three routes. |
| `feedback.test.js` (7) | **NEW 2026-07-31.** `POST /api/v1/feedback` — zero prior coverage. Valid submission, optional fields, validation, DB-error, 401 rejection, and **FB-7**: regression guard for the admin.js mount-order bug this file's authoring discovered (see Zero-Downtime / app.js note below) — a non-admin coach must reach 201, not 403. |

**CI**: the `backend-unit` job in `.github/workflows/ci.yml` runs `npm run test:unit` on every push/PR — hermetic, no Render dependency (unlike the integration `backend` job that polls prod). It gates the sync-script and main-deploy (smoke) jobs.

---

## Migration Notes

> **!! CORRECTED 2026-07-13.** This section previously named
> `backend/src/db/migrations/` as canonical and said "no new files in
> `backend/migrations/`". That was stale and contradicted reality: every migration
> applied to production in July 2026 (005-012) went into `backend/migrations/`.
> A governing doc asserting the opposite of what we actually do is exactly the class
> of error that caused the incidents in #342, #351 and #355.

- **Canonical migration directory: `backend/migrations/`.** New migrations go here.
- `backend/src/db/migrations/` is the ORIGINAL tree (001-007). It is historical.
  Do not add to it. Do not rebuild from it without reading the warnings below.

### !! FIVE NUMERIC COLLISIONS ACROSS THE TWO TREES !!

The same number means different migrations depending on the tree. "Run migration 007"
is ambiguous. Always give the full path.

| # | `backend/migrations/` | `backend/src/db/migrations/` |
|---|---|---|
| 002 | `002_team_data_history.sql` | `002_create_profiles.sql` |
| 004 | `004_rls_fixes.sql` (see warning) | `004_rls_policies.sql` |
| 005 | `005_p0_lock_auth_events.sql` | `005_atomic_verify_function.sql` (**STALE - see below**) |
| 006 | `006_p0_lock_team_data_history.sql` | `006_create_feedback.sql` |
| 007 | `007_p1_fix_recursive_rls_policy.sql` | `007_add_coach_pin.sql` |

### !! TWO FILES IN THE OLD TREE ARE DANGEROUS !!

- **`backend/src/db/migrations/005_atomic_verify_function.sql`** defines
  `activate_membership()`. That function was **DROPPED in production**
  (migration 012) - it was dead code (zero callers), phone-era residue (phone auth
  was permanently removed), it declared `team_id UUID` when the column is `TEXT`
  (so it would error on the first returned row), and it was `SECURITY DEFINER` with
  no pinned `search_path` - a privilege-escalation vector.
  **Rebuilding from this file re-creates a broken, vulnerable, uncalled function.**

- **`backend/src/db/migrations/004_rls_policies.sql`** contains the recursive
  `team_memberships` policy that made **every authenticated read of that table throw**
  (`infinite recursion detected`). The admin panel's gate had never worked. Fixed in
  `backend/migrations/007_p1_fix_recursive_rls_policy.sql`.
  **Rebuilding from this file re-breaks the admin panel.**

### !! versionHistory.js CAN CITE OLD-TREE NUMBERS THAT LOOK CANONICAL !!

`versionHistory.js` v2.1.0 cites "migrations 008-012: email support" (April 2026).
The canonical `backend/migrations/` 008-012 are unrelated July 2026 RLS/schema
work (FK fix, role CHECK widen, view RLS bypass fix, search_path pin). The old
tree never had files numbered 008+ — the versionHistory citation refers to work
that was never committed as a numbered file in either tree, or was tracked
differently. **Never map a versionHistory migration-number citation onto
`backend/migrations/` by number.** Verify actual schema state against the
ground truth below, not migration numbers or version-history prose.

**Ground truth is `docs/db/PROD_SCHEMA_BASELINE.md` + `PROD_SCHEMA_BASELINE_ADDENDUM_1.md`,
not either migration tree.** Both trees describe databases that do not exist.

---

## Score Reporting Automation

- Microsoft Forms URL pre-fill does not work — confirmed by testing
- Direct backend POST blocked by session CSRF token (`__RequestVerificationToken` + `FormsWebSessionId` cookie)
- Chosen approach: n8n webhook orchestration (GET token → POST submission)
- All field IDs and endpoint documented in `docs/product/ROADMAP.md` under Backlog → Automated Score Reporting
- Power Automate webhook (county-side) documented as long-term fallback
- Schema migration needed: split `location` field into `parkName` + `fieldNumber` before implementation
