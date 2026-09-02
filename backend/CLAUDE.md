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
| `APPROVE_LINK_HMAC_SECRET` | **Required** (`env.js` throws at boot if unset). Signs the 24h-expiring 1-tap approve/deny email links (#337, `lib/approveLinkToken.js`). Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Must also be set as a GitHub Actions repo secret (`backend` CI job) and on Render (prod) — separately from this file. |

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
- `/api/v1/home` → `src/routes/home.js` — `GET /api/v1/home` (#1012 Phase 1, authenticated Home read model; not yet wired to any real user, `API_DRIVEN_HOME` defaults off in the frontend). **Mounted before `adminRouter`, same reasoning as `feedbackRouter` below.**
- `/api/v1` → `src/routes/feedback.js` **and** `src/routes/admin.js`, **feedback mounted first — order matters, see warning below**

**⚠️ Admin route paths are NOT under `/api/v1/admin/`.** admin.js mounts bare at `/api/v1`, so its protected handlers are `/api/v1/requests`, `/api/v1/members`, `/api/v1/approve`, `/api/v1/reject`, `/api/v1/update-role` (POST), `/api/v1/reset-access`, `/api/v1/suspend`, `/api/v1/feedback` (GET — admin listing of all coach feedback/bug submissions; distinct from `feedback.js`'s `POST /api/v1/feedback`, reachable via the same base only because `feedback.js` never defines a GET handler for it to collide with — **found missing from this list entirely during the #406/#410 test-health survey, 2026-08-26**, along with having zero test coverage of any kind at the time), `/api/v1/feature-flags/:flagName` (PATCH), `/api/v1/coaches` (POST), `/api/v1/coaches/:membershipId` (DELETE), `/api/v1/teams` (POST — additive to, and distinct from, `teamData.js`'s `/api/v1/teams/*` sub-routes; see the mount-order note below), `/api/v1/teams/:teamId/roster` (POST), `/api/v1/teams/:teamId/schedule` (POST). Only the two public 1-tap email links carry `/admin`: `GET /api/v1/admin/approve-link`, `GET /api/v1/admin/deny-link`. A router-level `router.use(requireAuth, requireAdmin)` (admin.js:172) sits **after** the public links and **before** the protected handlers; it is path/method-agnostic, so it 401s any unmatched path under the router too. (This is why the legacy `suite-admin.js` "passed" against non-existent `/api/v1/admin/*` paths — it hit the catch-all, not the real routes. See Story 99.)

**⚠️ The `/api/v1/teams`, `/api/v1/teams/:teamId/roster`, and `/api/v1/teams/:teamId/schedule` admin routes above only resolve via a mount-order fallthrough — not a distinct mount point.** `app.js` mounts `teamDataRouter` at `/api/v1/teams` *before* `adminRouter` at bare `/api/v1`. `teamDataRouter` has no route matching these three exact paths (its own routes are `/search`, `/:teamId/data`, `/:teamId/history`, `/:teamId`), so Express falls through past it to `adminRouter`, which defines these paths as `/teams`, `/teams/:teamId/roster`, `/teams/:teamId/schedule` on its own bare-`/api/v1` mount. This is deliberate (#787/#791-793, verified against `teamData.js`'s actual route list before shipping, not assumed) — but it means any *new* route ever added to `teamData.js` at one of these exact paths would silently shadow the corresponding admin route. Check both files before adding a new `teamData.js` route.

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
- **Prod blast-radius fence (#339, `scripts/tests/prodGuard.js`):** the five write-heavy suites (auth-flow, idempotency, device-context, audit-trail, data-integrity) now unconditionally refuse to run if `SUPABASE_URL` resolves to the PROD project ref — checked regardless of `CI_SAFE`, not just skipped by it. Root cause of the historical orphaned `team_memberships` rows: those suites' own `state.testEmails` cleanup only runs if the process reaches the end, so a crashed/interrupted local run (plausible before `SUPABASE_TARGET=dev` existed) against a `.env` pointed at prod left rows behind with nothing to stop it. Mirrors the same fence pattern as `src/__tests__/rls/clients.js`'s `assertDevProject()`. Unit-tested in `src/__tests__/prodGuard.test.js`.
- **Separately, `suite-validation.js`'s VAL-07 fixed (#339):** that spec runs unconditionally (even under `CI_SAFE`, even against prod — it's not one of the five gated suites) and can legitimately get a real `201` back, inserting a real `access_requests` row — but it never pushed its email into `state.testEmails`, so the existing end-of-run cleanup never saw it. This was the live, ongoing mechanism behind the several-hundred-row `access_requests` pollution in #339 (firing on every CI run against the prod-facing `backend` job, not just a one-time historical artifact) — now tracked and cleaned up like every other suite's rows.

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

Unit suite total: **361** — up from 299 after PR #1035 (#1012 Phase 1) added `home.route.test.js` (25), `homeCapabilities.test.js` (14), `homeSummary.test.js` (15), and `homeSchema.contract.test.js` (8) for the new `GET /api/v1/home` route, capability/action assembly, next-event/readiness computation, and schema-contract validation — none reachable by any real user yet (`API_DRIVEN_HOME` defaults off in the frontend). Prior to that, 299 — up from 295 after `requireAuth.phoneHint.test.js` (#966, QA Coverage Scope follow-up #965) added the missing error-truthy-with-a-phone-present rejection-branch coverage for `middleware/requireAuth.js`. Tests are hermetic; no live database or external network was used.

**Corrected 2026-08-25:** the prior "147" total (2026-08-19) predated three files that already existed in the repo but were undocumented in this table (`teamsSearch.route.test.js`, `cors.test.js`, `reject.test.js` — 30 tests combined) — same class of drift as the 2026-08-08 corrections below, not new. `admin.auth.test.js`'s count also grew from 9→15 as the 6 new admin.js routes below each got a 401-rejection case added alongside their own dedicated success-path spec file.

**Two corrections made 2026-08-08 (v2.9.0 release-prep docs pass), both pre-existing and unrelated to that release's own changes:**
1. `teamData.delete.test.js` (6 tests, covers `DELETE /api/v1/teams/:teamId`, #380) already existed in the repo but was missing from this table entirely — added below.
2. `normalizeRole.test.js` was labeled `(13)` but actually has **34** tests — node's test runner counts subtests nested under `describe()` blocks, and the per-file label was never updated even though the table's own aggregate total already reflected the correct number. Corrected below.

Per-file counts below verified individually via `node --test <file>` on 2026-08-25 (all 25 files re-run fresh, not spot-checked).

| Spec | Covers |
|------|--------|
| `admin.auth.test.js` (16) | Admin routes reject no-token requests with **401** at their real bare `/api/v1/*` paths — the original 7 (requests/members/approve/reject/update-role/reset-access/suspend) plus the 6 admin.html-bypass routes added 2026-08-25 (feature-flags/coaches POST+DELETE/teams/roster/schedule) plus `GET /api/v1/feedback` added 2026-08-26 (#406/#410 survey — previously missing entirely); public `/api/v1/admin/{approve,deny}-link` return 400 for a **missing** token. **Corrected 2026-08-25 (#337):** these two links now also return 401 for a **tampered/malformed** token and 410 for an expired one — see `adminLinkToken.route.test.js` below; this file's own "never 401" framing only ever covered the missing-param case, unchanged. Rejection-path only — see each route's own dedicated spec file below for authorized-action coverage. |
| `adminFeedback.test.js` (6) | **NEW 2026-08-26 (#406/#410 test-health survey).** `GET /api/v1/feedback` (admin listing) — authorized admin 200 with feedback array + total count, `?type=feedback`/`?type=bug` filters applied, no-filter returns all rows, invalid `?type` → 400, DB error → 500. Previously had zero coverage of any kind — not even in `admin.auth.test.js` — and was absent from this file's own route enumeration above until this pass. |
| `adminFeatureFlags.test.js` (6) | `PATCH /api/v1/feature-flags/:flagName` (#788) — enabled true/false both directions + payload shape, URL param (not body) trusted for `flagName`, missing/non-boolean `enabled` → 400, DB error → 500. |
| `adminRemoveCoach.test.js` (3) | `DELETE /api/v1/coaches/:membershipId` (#789) — valid UUID → 200 + correct delete call, non-UUID → 400, DB error → 500. Preserves hard-delete semantics verbatim (no soft-suspend change bundled in). |
| `adminAddCoach.test.js` (8) | `POST /api/v1/coaches` (#790) — new coach with/without a matching auth user, duplicate-membership → 409 `ALREADY_MEMBER`, missing/invalid field validation ×3 (`teamId`/`email`/`role` against `CANONICAL_ROLES`), DB error on the duplicate pre-check, DB error on insert. |
| `adminAddTeam.test.js` (8) | `POST /api/v1/teams` (#791) — full payload success + server-generated id, client-supplied id ignored, optional-field defaults, missing name/season, invalid season, year out of bounds, DB error. T1 doubles as a regression guard for the `teamData.js`-mount-order fallthrough this route depends on. |
| `adminRosterSave.test.js` (8) | `POST /api/v1/teams/:teamId/roster` (#792) — non-empty roster success, wipe-guard trip with correct count, empty-over-empty/no-row safe writes, missing/invalid `roster` field, the guard's fail-safe-on-read-error path, DB error on upsert. Reuses `teamData.js`'s exported `rosterWipeGuard`, not a duplicate. |
| `adminScheduleSave.test.js` (5) | `POST /api/v1/teams/:teamId/schedule` (#793) — non-empty schedule success, missing/invalid `schedule` field, DB error, and **S3**: a dedicated negative test proving an empty schedule write is *not* blocked (this route deliberately has no wipe guard — Clear Schedule is an intentional wipe). |
| `adminRequests.test.js` (3) | **NEW 2026-08-26 (#474 closure).** `GET /api/v1/requests` — no `?status` defaults to `pending`, explicit `?status=approved` overrides it, DB error → 500. |
| `adminMembers.test.js` (4) | **NEW 2026-08-26 (#474 closure).** `GET /api/v1/members` — field-rename mapping (`id`→`membershipId`, `team_id`→`teamId`, etc.) verified exactly, invited member with no `profiles` row yet → `firstName`/`lastName` null not a crash, empty list → `200` with `[]`, DB error → 500. |
| `adminMembershipActions.test.js` (10) | **NEW 2026-08-26 (#474 closure).** `POST /api/v1/update-role`, `POST /api/v1/reset-access`, `POST /api/v1/suspend` grouped in one file — all three are simple single-field mutations on the same `team_memberships` row. Each: valid update → 200 with the exact update payload + target row asserted, invalid input → 400 (role not in `CANONICAL_ROLES` / non-UUID `membershipId`), DB error → 500. |
| `teamData.guard.test.js` (12) | `rosterWipeGuard` unit suite + `isAdminRequest` truth table — direct unit tests (the route-level 403 is unreachable in-process; see `teamData.routes.test.js` header). |
| `teamData.envGuard.test.js` (2) | Production-mode `FORBIDDEN_TEST_DATA` rejection for test team IDs on POST + GET. |
| `teamData.routes.test.js` (6) | Route-level `POST/GET /api/v1/teams/:id` (+ legacy `/api/teams`): 409 wipe-guard, `force` override, dual-mount smoke, DB-error 500, history limit clamp. `supabaseAdmin.from`/`.rpc` monkey-patched. |
| `teamData.delete.test.js` (6) | **Pre-existing, added to this table 2026-08-08 (was undocumented).** Route-level `DELETE /api/v1/teams/:teamId` (#380): no-token 401, non-admin 403, authenticated-admin 200 + delete call, membership-check DB error 500, delete-itself DB error 500, legacy `/api/teams` dual-mount smoke. `requireAuth` stubbed via `supabaseAdmin.auth.getUser`. |
| `aiProxy.test.js` (6) | `POST /api/ai`: 503 unconfigured, **413 oversize (v2.2.4 regression guard)**, 400 bad type, 200 upstream status/body relay + call-shape (`claude-sonnet-4-6`, max_tokens, content), 504 AbortError, 502 unreachable. `global.fetch` stubbed; `ANTHROPIC_API_KEY` save/restore. |
| `auth.happy.test.js` (4) | `POST /request-access` 201/409 + `POST /magic-link` 200/403. Hermetic via shared-`supabaseAdmin` patch (also covers `logAuthEvent`), `signInWithOtp` stub, and `global.fetch` stub for the Resend send. |
| `legalConsent.test.js` (7) | **NEW, migration 028 (applied and functionally verified on DEV and PROD 2026-08-29).** `POST /api/v1/auth/consent` — multi-doc consent → 201 + one `legal_consents` row per doc with `version` only (never doc text), email normalized the same way as `/request-access` (#374), `context` defaults to `request_access`, missing email / empty `consents` / a consent item missing `version` → 400 with no insert attempted, DB error → 500. A brand-new route (additive only, per the Zero-Downtime Constraint above) — does not touch `/request-access`'s existing handler or `access_requests`. |
| `email.test.js` (7) | **NEW 2026-08-29 (#917).** Pins the Resend delivery contract: missing-key skip, production recipient, DEV recipient override, signed admin action links, denial email, and swallowed non-2xx/thrown-fetch failures. |
| `ops.health.test.js` (4) | **NEW 2026-08-29 (#916).** Covers healthy/degraded/unreachable `GET /api/v1/ops/health` responses and proves `GET /api/v1/ops/ping` is a DB-free liveness endpoint. |
| `approve.role.test.js` (6) | `POST /api/v1/approve` role-transition behavior. Landed between Phase 2 tranche 2 and Story 99's closure without a doc update — backfilled here 2026-07-31. |
| `approveLink.role.test.js` (7) | `GET /api/v1/admin/approve-link` role-transition behavior (the public 1-tap email link). Backfilled 2026-07-31 — see note above. **Updated 2026-08-25 (#337):** now signs a real token via `approveLinkToken.sign()` instead of passing raw `requestId`/`teamId` query params — WS-1 role-normalization assertions themselves unchanged. |
| `approveLinkToken.test.js` (9) | **NEW 2026-08-25 (#337).** `lib/approveLinkToken.js` sign/verify round trip — tamper (payload segment, signature segment, wrong secret), expiry (`TOKEN_EXPIRED` distinct from `TOKEN_TAMPERED`), action-binding (an approve token can't verify as a deny token), malformed input, `sign()`'s required-field guard. |
| `adminLinkToken.route.test.js` (11) | **NEW 2026-08-25 (#337).** Route-level token security for both public links: valid token approves/denies + sets `reviewed_by` to the resolved admin, tampered → 401, expired → 410, cross-action replay → 401, missing token → 400 (unchanged contract), unresolvable `reviewed_by` (no auth user matching `ADMIN_EMAIL`) → null, not a crash. |
| `adminLinkLimiter.test.js` (1) | **NEW 2026-08-25 (#337, CodeQL js/missing-rate-limiting follow-up).** `adminLinkLimiter` (admin.js) — IP-keyed, 20 req/15min, shared across both `/admin/approve-link` and `/admin/deny-link`. One ordered test tracking the running request count (this version of `express-rate-limit` exposes `resetKey()` but not `resetAll()`, and the exact key string isn't worth depending on): requests under the limit reach the real handler, the 21st overall is blocked, and the block is shared across both routes rather than a separate budget per route. |
| `reject.test.js` (8) | **Pre-existing, added to this table 2026-08-25 (was undocumented).** Route-level `POST /admin/reject` authorized-success path: pending → 200/rejected/reviewed_by, notes passed/omitted, already-processed → 409, nonexistent → 409, missing/non-UUID `requestId` → 400. Previously only exercised by `admin.auth.test.js`'s blanket 401 check. |
| `requestAccess.role.test.js` (7) | `POST /api/v1/request-access` role validation. Backfilled 2026-07-31 — see note above. |
| `requestAccessLimiter.test.js` (3) | **NEW 2026-08-08 (v2.9.0 security hardening).** `requestAccessLimiter` (auth.js) — same email-keyed design as `loginLimiter`, 10 req/60min. Same-email exhaustion (429 on 11th), a different email unaffected by another's exhausted budget, phone-only requests exempt via `skip()`. RED→GREEN verified. |
| `normalizeRole.test.js` (34) | `normalizeRole()` — the code-level enforcement of the four-role model documented in root `CLAUDE.md` → Multi-team design. Backfilled 2026-07-31 — see note above. Count corrected 2026-08-08 (was mislabeled `13`; see correction note above the table). |
| `loginLimiter.test.js` (3) | **NEW 2026-07-31.** `loginLimiter` (auth.js) keyed by email, not IP — Story 26 fix. Same email exhausts its own budget (429 on the 6th attempt); a different email is unaffected by another's exhausted budget (the actual bug); no-email requests are exempt via `skip()`. RED→GREEN mutation-verified. |
| `auth.session.test.js` (9) | **NEW 2026-07-31.** `GET /me`, `PATCH /me`, `POST /logout` — zero prior coverage. Hydrated-user happy path, missing-profile non-crash, validation and not-found paths, and 401 rejection for all three routes. **+1 2026-08-26 (#406/#410 survey):** a membership row holding a legacy role value (`team_admin`) is returned verbatim by `GET /me`, not normalized — locks in current, presumed-intentional behavior per the documented role model. |
| `authRateLimiter.test.js` (6) | **NEW (#651, CodeQL js/missing-rate-limiting alerts #12/#15 follow-up).** `meLimiter` (`GET /me`, 100 req/15min) and `logoutLimiter` (`POST /logout`, 20 req/15min) — both user-id-keyed, not email-keyed like `loginLimiter`/`requestAccessLimiter`, since both routes sit behind `requireAuth` and the caller already holds a session. Same-user exhaustion, a different user unaffected by another's exhausted budget, and an unauthenticated request rejected by `requireAuth` (401) before the limiter ever sees it — for both routes. RED→GREEN verified (stashed the route change, confirmed all 4 exhaustion/isolation assertions fail without it, restored). |
| `requireAdmin.test.js` (4) | **NEW 2026-08-26 (#406/#410 test-health survey).** Direct unit coverage for `middleware/requireAdmin.js`, calling it without the app/route layer — previously exercised only indirectly via other routes' stubs. Active-admin success sets `req.adminMembership` and calls `next()`, no-matching-row → 403, DB error → 403 (fail-closed), and the exact `.eq()` filter shape (`user_id`/`role`='admin'/`status`='active') — the last one is a known-limitation lock-in, not a fix: it confirms a legacy `team_admin`-valued row is excluded by the query before the middleware ever inspects it. |
| `requireAuth.phoneHint.test.js` (4) | **NEW (#966, QA Coverage Scope follow-up #965).** Direct unit coverage for `middleware/requireAuth.js`'s rejection-logging phone-hint branch, calling the middleware without the app/route layer (same pattern as `requireAdmin.test.js`). The speculated dead-code question is resolved: a live read-only prod query (`hzaajccyurlyeweekvma`) found 7 `auth.users` rows, 1 with `phone` set, so the branch is reachable — not removed. No Authorization header → 401, `getUser()` never called; `{ data: null, error }` → 401 with no phone hint; **the real gap**: `error` truthy AND `data.user.phone` present simultaneously → 401 with the `console.warn` line containing `phone=` followed by the real `maskPhone()` output (computed via the actual import, not hardcoded); successful `getUser()` → `next()` called, `req.user` set, no 401. `maskPhone`'s own masking behavior is covered separately by `phone.test.js` — this file only asserts `requireAuth` calls it correctly. RED→GREEN mutation-verified: temporarily blanked the `hint` line, confirmed the phone-hint test (only that one) went RED with the exact expected-vs-actual mismatch, restored the file byte-for-byte (`git diff --stat` empty), confirmed GREEN again. |
| `feedback.test.js` (7) | **NEW 2026-07-31.** `POST /api/v1/feedback` — zero prior coverage. Valid submission, optional fields, validation, DB-error, 401 rejection, and **FB-7**: regression guard for the admin.js mount-order bug this file's authoring discovered (see Zero-Downtime / app.js note below) — a non-admin coach must reach 201, not 403. |
| `teamData.logInjection.test.js` (5) | **NEW 2026-08-08 (v2.9.0 security hardening).** Log-injection fix (CWE-134) at the 5 `console.error` sites in `teamData.js` — spies on `console.error`, asserts `{ teamId, error }` is passed as a structured second argument (not interpolated into the message string) using a `teamId` containing `%s`. |
| `teamsSearch.route.test.js` (13) | **Pre-existing, added to this table 2026-08-25 (was undocumented).** `GET /api/v1/teams/search` (Story 124/#655) — the file that originally moved the total from 125→147/2026-08-19 but was never itself added as a row here. |
| `teamsSearchLimiter.test.js` (1) | **Found undocumented during v3.0.0 release audit (2026-08-29) — landed on `develop` before this pass but never added to this table.** `searchLimiter` (20 req/15min, IP-keyed) on `GET /api/v1/teams/search` — one ordered test confirming 20 requests reach the real handler and the 21st is blocked. |
| `cors.test.js` (9) | **Pre-existing, added to this table 2026-08-25 (was undocumented).** CORS allowlist behavior across the backend's configured origins. **C9's assertion rewritten in v3.0.0** (PR #904) from a substring `.includes()` check to exact match — fixed a CodeQL `js/incomplete-url-substring-sanitization` false positive that blocked the v3.0.0 `develop → main` promote; test count and behavior unchanged. |
| `emailNormalization.test.js` (4) | **Found undocumented during v3.0.0 release audit (2026-08-29) — landed on `develop` via PR #894 but never added to this table.** Gmail dot-variant login match (#374): membership stored with/without dots vs. login typed the opposite way both match (EN1/EN2), case-insensitive match (EN3), and a genuinely different email is still correctly rejected, not over-matched (EN4). |
| `prodGuard.test.js` (4) | **NEW 2026-08-27 (#339).** `scripts/tests/prodGuard.js`'s `assertNotProd()` — throws for a URL containing the PROD project ref, passes for DEV/local/unset. Guards `test-runner.js`'s write-heavy suite block unconditionally, regardless of `CI_SAFE`. |
| `env.legacyKeyWarning.test.js` (3) | **NEW (#387 backend-infra fix batch).** `src/lib/env.js`'s legacy-Supabase-key boot warning — a stale `eyJ...` legacy JWT in `SUPABASE_ANON_KEY` broke every prod login for ~15min in the 2026-07-20 cutover incident with no startup-time signal. Warns (does not throw, since DEV's project still uses legacy keys deliberately) when `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` matches the `eyJ...` pattern; asserts silence for new-style `sb_secret_`/`sb_publishable_` keys. Clears `require.cache` per case since `env.js` runs its checks as module-level side effects on require. |
| `home.route.test.js` (25) | **NEW (#1012 Phase 1, PR #1035).** `GET /api/v1/home` end-to-end: 401 unauthenticated, malformed/expired token, one active team, multiple teams, mixed roles, inactive membership excluded, email-linked membership, duplicate team names, no-upcoming-event, `If-None-Match` → 304, and cross-team nested-resource isolation (no service-role field leakage, no other team's data reachable). |
| `homeCapabilities.test.js` (14) | **NEW (#1012 Phase 1, PR #1035).** `src/lib/homeCapabilities.js` — role → capability → contextual-action mapping, the server-side source of truth for what a coach/parent/scorekeeper can do. Stable, deterministic action ids/hrefs per role/team-state combination. |
| `homeSummary.test.js` (15) | **NEW (#1012 Phase 1, PR #1035).** `src/lib/homeSummary.js` — next-event and readiness computation (rosterCount/confirmedCount/lineupStatus). `lineupId` always resolves `null` — confirmed deliberate: the live schema has one `grid`/`batting_order` row per `team_data`, not a separate per-game lineup resource. |
| `homeSchema.contract.test.js` (8) | **NEW (#1012 Phase 1, PR #1035).** `backend/src/contracts/homeReadModel.v1.schema.json` + `validateHomeResponse.js` — every response shape validates against the versioned schema; a deliberately malformed fixture is rejected, not silently accepted. |

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
- **`017_fix_prune_roster_snapshots_security_definer.sql` — APPLIED TO DEV
  AND PROD, both 2026-08-01.** Fixes a live bug found while writing #477's
  RLS coverage: the roster_snapshots auto-prune trigger has no SECURITY
  DEFINER, so its internal DELETE runs as the caller — and migration 004
  revoked DELETE on this table from anon/authenticated. Net effect: every
  `dbSnapshotRoster()` insert (frontend/src/supabase.js, called on app load +
  every roster auto-save) was silently failing from v2.6.0 (2026-07-20)
  until this fix. CI-validated against the ephemeral stack, re-verified with
  `npm run test:rls` run directly against DEV (15/15 pass, RS5 included),
  and confirmed live on PROD via a direct query (KK). PR #486 documented
  PROD as pending at the time it merged; that framing is now corrected —
  see the migration file's own header for the full chain of evidence.
- **`018_auto_provision_team_membership_on_create.sql` — APPLIED TO DEV
  2026-08-06 AND PROD 2026-08-07.** Fixes #561: `createTeam()`'s self-serve
  flow never provisioned a `team_memberships` row for the creator, so a
  coach's first `team_data` save for a newly-created team was silently
  RLS-denied by `team_data_auth_insert`'s WITH CHECK. A `SECURITY DEFINER`
  `AFTER INSERT` trigger (`handle_new_team`) on `public.teams` now
  auto-provisions `role=admin`/`status=active` membership for `auth.uid()`.
  A second, more severe bug found investigating this (`dbSaveTeams()`'s
  `.upsert(onConflict)` call shape was unconditionally RLS-denied for
  *every* new team, not just a second one — Postgres enforces the UPDATE
  policy's WITH CHECK for `INSERT ... ON CONFLICT DO UPDATE` even when no
  conflict occurs) was fixed separately in `frontend/src/supabase.js`
  (plain INSERT with a conflict-only UPDATE fallback). RED→GREEN verified
  via the new `backend/src/__tests__/rls/teamMembershipAutoProvision.test.js`
  (TM1-TM4) against DEV before either fix; prod apply verified read-only
  (`pg_trigger`/`pg_proc` catalog check, no test writes against prod data).
  **Not backfilled, and not possible to backfill:** `teams.owner_id` is
  always `''`, never populated by any write path, so already-broken
  membership-less teams created before this fix cannot be traced back to
  their creator automatically — recovering those needs a manual admin
  action per affected team.
- **`022_add_team_season.sql` / `023_enforce_team_season_not_null.sql` —
  APPLIED TO DEV (psqvzppphdedqkpmarwx) 2026-08-18, both in one combined
  apply (DEV is low-stakes, so both phases ran back to back the same
  session). `022` also APPLIED TO PROD (hzaajccyurlyeweekvma) 2026-08-19,
  ahead of the v2.11.0 main promote (soak-override day) — verified via
  direct query: 6/6 teams, 0 NULL season, all backfilled to `'Spring'`.
  `023` APPLIED TO PROD 2026-08-30 after a live precheck confirmed 6/6 teams,
  0 NULL and 0 invalid seasons; the season-aware release had been live since
  v2.11.0.** Adds `teams.season` (`'Spring'` |
  `'Fall'`, paired with the existing `year` column — display sites combine
  them, e.g. "Spring 26"). Deliberately split into two migrations for the
  eventual PROD rollout, per the Zero-Downtime Constraint above — running
  the NOT NULL/CHECK phase before the season-aware release is live in PROD
  would hard-fail every write from the currently-deployed (season-unaware)
  frontend/admin.html:
    1. **022** — add `season` nullable, backfill existing rows to
       `'Spring'`. Safe to run against PROD any time; the currently-deployed
       code never references the column. **Done — applied to PROD
       2026-08-19.**
    2. Deploy the season-aware release. **Done in v2.11.0.**
    3. **023** — after that release has been live in PROD long enough
       to verify `SELECT count(*) FROM public.teams WHERE season IS NULL`
       returns `0`, add `NOT NULL` + `CHECK (season IN ('Spring', 'Fall'))`.
       **Done 2026-08-30; schema.sql now reflects the constrained live state.**
- **`026_write_source_role_fallback.sql` — APPLIED TO DEV (psqvzppphdedqkpmarwx)
  AND PROD (hzaajccyurlyeweekvma), both 2026-08-28 (same session, KK
  confirmed go-ahead before the prod apply).** Fixes #379: `team_data_history.write_source`
  was `'unknown'` on every row in PROD (3,000/3,000, confirmed live) despite
  `teamData.js` appearing to set it — root cause was `set_config(...,
  is_local: true)` and the `.upsert()` running as two separate Supabase
  calls, hence two separate transactions, so the setting never reached the
  write it was meant to tag. Affects every write path, including the
  dominant one (`frontend/src/supabase.js`'s `dbSaveTeamData()`, which never
  touches `app.write_source` at all — see 006's header). Final fix:
  `snapshot_team_data()` reads PostgREST's transaction-local
  `request.jwt.claims` JSON and uses its `role` claim as the fallback. An
  earlier two-trigger/GUC attempt (`capture_write_source_role`) was removed
  before the live implementation settled but remained stale in the committed
  migration and test comments until the 2026-08-30 reconciliation. RED→GREEN verified via
  the new `backend/src/__tests__/rls/writeSourceRoleFallback.test.js`
  (WSF1/WSF2 — service_role and authenticated writes each record their real
  role, not `'unknown'`) against both the local ephemeral stack and DEV; also
  added to `backend/scripts/apply-rls-bootstrap.sh`'s replay list so CI's
  `rls` job validates it. Prod apply verified structurally (function
  definitions confirmed byte-identical to DEV via `pg_get_functiondef`,
  `SECURITY DEFINER`/search_path pin on `snapshot_team_data()` confirmed
  intact, not reverted; Supabase security advisors re-run) — no test write
  was made against real prod data. Live DEV/PROD function hashes were still
  identical on 2026-08-30, and recent history rows recorded `authenticated`.
- **`027_add_magic_link_requested_to_auth_events.sql` — APPLIED TO DEV
  (psqvzppphdedqkpmarwx) AND PROD (hzaajccyurlyeweekvma), both 2026-08-29
  (same session, KK confirmed go-ahead before the prod apply).** Fixes #736:
  `auth_events.event_type`'s CHECK constraint (hand-set in Supabase, not
  tracked in either migration tree) predates the v2.1.0 OTP→magic-link
  switch and never allowed `'magic_link_requested'` — every `POST
  /magic-link` audit-event insert had been silently rejected since v2.1.0
  (`logAuthEvent()` swallows the error; login itself unaffected). Adds
  `'magic_link_requested'` to the constraint's allowed `ARRAY` (Option A
  from the issue — the constraint was stale, not the code). `docs/db/schema.sql`'s
  `auth_events` CREATE TABLE statement was edited directly to already
  include the new value, so this migration does not need replaying in
  `apply-rls-bootstrap.sh`'s ephemeral-CI `FILES` list — same treatment as
  005-012 (see that script's own header). RED→GREEN verified: the new
  `backend/src/__tests__/rls/authEventsMagicLinkType.test.js` (AEML1)
  RED-confirmed against real DEV Postgres before the apply (`violates check
  constraint auth_events_event_type_check`, exact same error text the
  original issue reports for prod) and GREEN after. Both DEV and PROD
  additionally verified live, same session, via a direct real insert +
  cleanup against each database (not just a `pg_constraint` query), and
  Supabase security advisors re-run clean on both with no new findings.
  Merged via [PR #893](https://github.com/kaushikkuberanathan/lineup_generator/pull/893).
- **`028_add_legal_consents_table.sql` — APPLIED TO DEV (psqvzppphdedqkpmarwx)
  AND PROD (hzaajccyurlyeweekvma), both 2026-08-29 (same session, KK
  confirmed go-ahead: "yes let's go and apply those migrations").**
  Adds `legal_consents` (new table, RLS enabled, zero policies — same
  service-role-only pattern as `team_data_history`, migration 006), keyed
  by `email`/`doc_id`/`version`/`context`/`accepted_at`, backing the new
  `POST /api/v1/auth/consent` route (`src/routes/auth.js`, additive-only —
  see the migration file's own header for why this couldn't be columns on
  `access_requests` instead: the Zero-Downtime Constraint above forbids
  modifying `POST /request-access`'s existing handler, and that's still in
  force pending Phase 4C). Stores only the accepted VERSION of each legal
  document (`frontend/src/content/legal.js`'s `LEGAL_DOCS[].versions[]`),
  never the document text — the version string is the pointer back to the
  exact words in that file's git history. Verified live on both DEV and
  PROD via a real insert + cleanup against each database (not just an
  `information_schema` query), and Supabase security advisors re-run clean
  on both — the only finding is the expected INFO-level "RLS enabled, no
  policies" on `legal_consents` itself, same as the pre-existing finding on
  `auth_events`/`team_data_history`. `docs/db/schema.sql` updated to
  include this table now that it's actually live, per this repo's own
  convention (see the 022/023 note above) that the ground-truth schema doc
  reflects only what's live, not a pending migration.
- **`033_scoring_rls_lockdown_section_b.sql` + `031_scoring_grant_revocation.sql`
  — APPLIED TO DEV (psqvzppphdedqkpmarwx) AND PROD (hzaajccyurlyeweekvma),
  both 2026-08-31 (033 then 031, same window, DEV first then PROD, KK
  confirmed go-ahead separately for each step including a dedicated
  confirmation before the PROD apply specifically).** Closes the core
  exploitable vulnerability in #355 (Phase 4C steps 4a/4b): drops the four
  hardcoded-team-id anon backdoor policies (`at_bats_anon_test`/
  `game_state_anon_test`/`scorer_lock_anon_test`/`audit_log_anon_test`) and
  the three unscoped `allow_scorer_writes FOR ALL USING(true)` catch-alls
  on the four live-scoring tables (033 — formalizes migration 019's dormant
  Section B as its own runnable file), then revokes the table-level GRANTs
  underneath them so `anon` holds zero privileges and `authenticated` holds
  exactly what migration 019 Section A's real policies use, no more (031 —
  RLS alone doesn't stop `TRUNCATE`, same reasoning as migration 004).
  Gated on the Phase 4C proposal doc's step 3 (a real production game-day
  soak, post-shim-flip) — confirmed complete by KK before this apply.
  **Verification, both databases:** `pg_policies` before/after confirmed
  all 7 backdoor/catch-all policies removed; `information_schema.role_table_grants`
  before/after confirmed `anon` at zero privileges and `authenticated`
  matching `031`'s own per-table enumeration exactly; `get_advisors`
  (security) re-run clean on both, no new findings on the four tables.
  **DEV additionally verified** via a live SQL-level probe simulating the
  `anon` role attempting a SELECT and two INSERTs (including the exact
  hardcoded-team-id backdoor payload) — all three rejected with
  `insufficient_privilege`. **PROD additionally verified** the same way for
  the SELECT probe; the equivalent live INSERT/UPDATE probe on PROD was
  blocked by this session's own tooling permissions before it could run, so
  PROD's live-probe confirmation rests on the identical catalog-level match
  to DEV's already-probe-confirmed state, not a repeated live probe. **Real
  end-to-end proof on PROD:** immediately after the apply, KK scored a real
  game (Mud Hens vs GHH, top and bottom of inning 1) through the live app;
  independently confirmed via `scoring_audit_log` — `at_bat_opened`,
  `pitch_recorded`, `at_bat_resolved`, `opp_pitch` ×7, `half_inning_ended`
  ×2, all recorded 2026-08-31 21:25:38–21:25:50 UTC, every row's
  `actor_user_id` = `951f66cc-afec-41b2-8c1a-58fc61f1b847` (KK's real
  `auth.users` UUID per root `CLAUDE.md`, not a device-id fallback or the
  zero-UUID shim this migration set out to make unreachable). **Not run:**
  the real `npm run test:rls` suite (`LS1`-`LS7` plus the full
  `S`/`T`/`M`/`RS` blocks covering `team_data`/`teams`/`roster_snapshots`/
  `team_memberships`) — no `backend/.env.rls.local` credentials were
  available in the session that did this apply. The branch's own
  `apply-rls-bootstrap.sh` update replays 019 → 033 → 031 on the ephemeral
  CI stack and un-skips `LS1`-`LS7`; the `rls` CI job on this branch's PR to
  `develop` is the first time that full suite actually runs against these
  two migrations. Deliberately left alone, a separate KK decision: the four
  `public_read_*` SELECT policies (019's own header flags these as probable
  un-narrowed leftovers with no real anon viewer route, but says explicitly
  to confirm with KK before dropping — not yet confirmed). Two of the
  proposal doc's seven steps remain open as tracked follow-up, out of scope
  for this apply: restoring `scorer_user_id`/`actor_user_id`/
  `recorded_by_id` from `TEXT` to `uuid`+FK, and removing the now-dead
  `isAdminTestMode` variable.

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

**Ground truth for object definitions is `docs/db/schema.sql`; `docs/db/PROD_SCHEMA_BASELINE.md`
carries the incident history and narrative only (merged 2026-08-27, #358 — the former
`PROD_SCHEMA_BASELINE_ADDENDUM_1.md` is now folded into it).** Neither migration tree
(`backend/migrations/` nor `backend/src/db/migrations/`) can be trusted to describe the
live database on its own.

---

## Score Reporting Automation

- Microsoft Forms URL pre-fill does not work — confirmed by testing
- Direct backend POST blocked by session CSRF token (`__RequestVerificationToken` + `FormsWebSessionId` cookie)
- Chosen approach: n8n webhook orchestration (GET token → POST submission)
- All field IDs and endpoint documented in `docs/product/ROADMAP.md` under Backlog → Automated Score Reporting
- Power Automate webhook (county-side) documented as long-term fallback
- Schema migration needed: split `location` field into `parkName` + `fieldNumber` before implementation
