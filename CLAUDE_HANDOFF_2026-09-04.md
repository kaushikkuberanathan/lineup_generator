# API-Driven Architecture Redesign — Handoff (2026-09-04)

Single-session handoff for whoever picks up initiative **#1012** next. Written
at a clean stopping point — nothing uncommitted, nothing mid-flight. Read this
before touching anything under `#1033` or the `API_DRIVEN_*` flags.

**Start here:** the visual roadmap artifact is the fastest orientation —
https://claude.ai/code/artifact/653ad153-59e8-494d-b357-a0f7a7c14cbe (private
to KK's account; if you can't open it, everything in it is also in this file
and in `docs/product/ROADMAP.md`/`CLAUDE.md`'s Current Version section).

---

## Immediate next task: pick up #1072

**Update 2026-09-04 (second session, this branch):** root cause is now
**confirmed**, not just hypothesized, and a partial code fix exists but is
**not deployed anywhere yet** — this needs a human decision before it goes
further. Read this update before the "as filed" section right below it.

**Root cause, confirmed against live infra:** queried Render (`get_service`)
and Supabase (`get_project`) directly. Both Render services
(`lineup-generator-backend` AND `lineup-generator-dev-backend`) run in
Render's `oregon` region. Both Supabase projects (`hzaajccyurlyeweekvma`
prod AND `psqvzppphdedqkpmarwx` dev) run in `us-east-1`. Cross-country hop on
every Supabase call, on both prod and dev — not a prod-only anomaly, which
rules out a lot of alternative explanations. The route's two *sequential*
round trips (membership query, then teams+team_data, which needs the first
round trip's team IDs before it can start) double that hop's cost.

**Code fix shipped on this branch, NOT applied to any live database:**
`backend/migrations/034_home_read_model_rpc.sql` adds
`public.home_read_model(p_user_id, p_email)` — a single Postgres statement
doing the same membership/teams/team_data resolution the route used to do in
two round trips. `backend/src/routes/home.js` now calls it via
`supabaseAdmin.rpc(...)` instead of the old two-step `.from()` sequence.
`home.route.test.js` and `homeSchema.contract.test.js` rewritten to stub
`.rpc()` instead of `.from()` (both now throw on any unexpected `.from()`
call, so a regression back to the old shape fails loudly). Full backend unit
suite re-run: **361/361 passing.** `docs/product/API_DRIVEN_ARCHITECTURE_REDESIGN.md`
§29.2 has a new status paragraph with the full finding.

**This is a partial fix, not full budget compliance.** It removes one of the
two round trips; it does not fix the underlying region mismatch. Getting all
the way under the 300ms p95 budget most likely also needs Render/Supabase
colocation — a real infra decision (cost, and either service needs
migrating/recreating in a new region, which is not a trivial in-place
change) that this session deliberately did **not** make unilaterally.

**What's genuinely left, in order:**
1. Someone with authority needs to decide: apply migration 034 to DEV (low
   risk, per this repo's own established pattern of building/verifying on
   DEV before PROD), then re-measure `GET /api/v1/home` latency there before
   touching PROD at all.
2. Apply to PROD only with explicit go-ahead (same pattern every other
   migration in `backend/CLAUDE.md`'s Migration Notes follows) — this
   session did not do this and should not be assumed done.
3. Re-measure against real PROD data, same methodology as #1072's original
   evidence (Render logs, `[home]` structured log line's `latencyMs`).
4. Decide on Render/Supabase colocation — a separate, bigger, costlier
   change — or explicitly accept the revised (RPC-only) latency as the new
   budget. Either way, record the decision on #1072 and update §29.2 to
   match reality, not aspiration.
5. Close out #1072's acceptance criteria only once 3-4 are actually done —
   do not mark it resolved off the code fix alone; the fix is unverified
   against a live database.

---

## #1072 as originally filed (for context — see the update above for current state)

While continuing #1033 this same session, the §29.2 performance budgets
(server latency, payload size, cached-paint timing) were measured against
real production data for the first time — previously assumed, never checked.
Payload passed comfortably. **Server latency failed:** p95 = 816ms against
`GET /api/v1/home` (41 real production requests, Render logs, 2026-09-03 to
2026-09-04) vs. the documented 300ms budget — median alone (386ms) already
exceeds it. Filed as **[#1072](https://github.com/kaushikkuberanathan/lineup_generator/issues/1072)**
with full measured evidence, a not-yet-verified hypothesis (two sequential
Supabase round-trips — a `team_memberships` query, then `teams`+`team_data`
in parallel — likely baseline network/connection overhead, not per-team
scaling, since this was measured at only 1-2 teams), and acceptance criteria
(root-cause, fix or explicitly accept a revised budget, re-measure the same
way, update §29.2 and #1033's rollout-boundary record).

**Not blocking** the current R4 monitoring window (that gate is exposure/
correctness, which is on track) — **but required before R5 planning starts.**
Full detail, including the raw latency/payload numbers and the exact Render
log query used, is in #1072 itself and in the two #1033 comments it
references (rollout-boundary records, then the measurement comment).

---

## Where things actually stand

- **v3.3.3 is live in production**, promoted via PR #1066 (merge `a1b916a`).
  Verified directly against Render + Vercel, not just asserted. Confirmed
  right now (2026-09-04): local repo HEAD `a1b916a` == `origin/main` exactly;
  `origin/main` is a confirmed ancestor of `origin/develop` (post-promote sync
  PR #1067 already merged). Working tree clean. Nothing to push.
- **Phase 0 (foundation, #1015-#1021) and Phase 1 (Home API, #1022-#1032)**
  are functionally complete — all shipped, all behind flags. **Their GitHub
  issues are still open** (#1012-#1032 all show as open in the tracker) —
  that's intentional, not a miss. They're epic/tracker issues meant to stay
  open through the whole initiative (through R6 legacy retirement), not
  auto-closed per-story. Don't "clean up" by closing them.
- **#1033 (rollout/soak tracker) is the only issue that's actually still
  active work.** It stays open by design until legacy Home is retired (R6).
- **Release ladder position: R4 (Limited cohort), monitoring window active.**
  R0-R3 done. R5 (default-on)/R6 (legacy retirement) not started — no work
  should happen there until R4 produces real evidence.

## What R4 actually means right now (read before doing anything)

**Cohort = KK's own identities only, self-testing.** Decided 2026-09-04, not
a placeholder — two roles across two teams: `icoachyouthball@gmail.com` as
`admin` on Mud Hens (`1774297491626`) + `scorekeeper` on Bananas
(`bananas-8u`). This is a deliberate scope decision, not an oversight.

**Real blast-radius check, done this session:** queried `team_memberships`
directly on both Mud Hens and Bananas. Found one previously-unknown real row,
`eshaan.kaushik122@gmail.com` (`coach` on Mud Hens, `status=active`,
`user_id: null`) — same never-signed-in state as the long-known Stan Hoover
row. Confirmed: **no one but KK can currently reach the API-driven path.**
Both flags (`API_DRIVEN_HOME`, `API_DRIVEN_ROUTES`) are DB-default-off (zero
rows in `feature_flags` for either) and only enabled via per-device
`localStorage` overrides.

**Real gap found, deliberately NOT built:** `frontend/src/hooks/
useFeatureFlags.js`'s `fetchTeamFlags(teamId)` is dead code — defined,
documented, never called anywhere. There is no working per-team DB flag gate
today, only the global-flags DB path (filtered `.is('team_id', null)`) and
per-device `localStorage`. A team-scoped DB row would be inert (nothing reads
it); a global row would enable the flags for every user. **If a real second
user ever needs to be onboarded to R4, this has to be built first** — don't
try to fake it with a DB row.

**Mixpanel baseline, verified against live data 2026-09-03 (not guessed):**

| Event | 14-day total | Pattern |
|---|---|---|
| `home_api_loaded` | 39 | 0 through 9/1 → 9 on 9/2 → 30 on 9/3 |
| `home_api_cache_rendered` | 33 | 0 through 9/1 → 7 on 9/2 → 26 on 9/3 |
| `home_deep_link_resolved` | 9 | 0 through 9/1 → 5 on 9/2 → 4 on 9/3 |
| `home_deep_link_denied` | 11 | 0 through 9/2 → 11 on 9/3 |
| `home_api_failed` | 1 | single occurrence, 9/3, `error_code: AUTH_REQUIRED` |

All 39 `home_api_loaded` events trace to 3 `distinct_id`s that are the same
person (KK, desktop + Android) — confirmed via a distinct_id breakdown, not
assumed. Zero events any day before 9/2. **This 39/33/9/11/1 line is the
reference point for #1033's §29.2 thresholds going forward.** Watch for: a
material jump in `home_api_failed`/`home_deep_link_denied`, or any of these
five events firing against a `distinct_id` that isn't KK's — either is the
signal something changed before it's a real-user incident.

Full data + reasoning posted to GitHub as two comments on #1033 (second one
corrects a placeholder-zero guess in the first — read both, the second is
the accurate one):
- https://github.com/kaushikkuberanathan/lineup_generator/issues/1033#issuecomment-5535072223
- https://github.com/kaushikkuberanathan/lineup_generator/issues/1033#issuecomment-5535167076

## What shipped this session (all live in prod, v3.3.3)

| Issue | What | Where |
|---|---|---|
| #1060 (P1) | Offline reload logged out a valid session — a network-failure validating `/api/v1/auth/me` was treated as a real auth rejection | `frontend/src/hooks/useAuth.js`, PR #1061 |
| #1062 (P2) | `navigator.onLine` can read `true` while every request is actually failing (confirmed: DevTools Network-throttle "Offline" doesn't flip it) — new self-correcting connectivity signal | `frontend/src/utils/networkHealth.js` (new file), wired into `client.js`/`useAuth.js`/`App.jsx`, PR #1064 |
| #1063 | Root `CLAUDE.md` wrongly claimed the DEV backend was deleted — it's live, points at its own Supabase project (`psqvzppphdedqkpmarwx`) | PR #1063 |
| #1059 | New `scripts/check-version-currency.js` CI check (prevents the exact version-staleness class of bug this repo has hit repeatedly) | Held on `develop`, rode along with this batch |
| — | The version-currency checker itself had a real gap: a "production is vX" banner correctly describing the still-live version *mid-release-prep* was flagged as stale. Added an "acknowledged release candidate" exception, RED→GREEN tested. | `scripts/check-version-currency.js` + its own test file |

Plus the full #1033 evidence checklist closed (cross-team denial, offline
rendering, back/forward continuity, team-filter toggle), and real two-role
coverage added in **both** Supabase projects (PROD `hzaajccyurlyeweekvma` and
DEV `psqvzppphdedqkpmarwx` — they're fully separate databases with different
`auth.users` UUIDs for the same email; a scorekeeper-membership write made
into PROD didn't show up on `dev.dugoutlineup.com` until repeated against
DEV — don't assume a write to one shows up in the other).

## Deliberately-not-done / open items

- **`develop`'s soak-lock branch protection is currently OFF.** It was
  unchecked earlier (a prior session) to unblock a sync PR and has not been
  re-enabled. **KK explicitly said "dont need it" (2026-09-04) when this was
  flagged** — this is a known, accepted state, not something to silently fix.
  Don't re-enable it without asking; if you do get asked to, note that this
  session couldn't do it via any available tool (see Environment gotchas).
- **`fetchTeamFlags` per-team DB gating** — real gap, not built. Only matters
  if a genuine multi-user cohort or R5 default-on comes up. Don't build it
  speculatively; it has no caller today and no design doc scoping it yet.
- **R5/R6 not started, correctly.** Don't advance the release ladder past R4
  without new evidence or an explicit KK decision — R4's whole premise is
  that self-testing is the current evidence source, and that's a scope
  decision revisited only if it turns out insufficient.

## Environment gotchas (hit this session, will hit again)

- **GitHub write access is split into two very different tiers.** Issue
  comments, PR creation, labels — all work fine via direct `curl` with
  `$GITHUB_TOKEN`/`$GH_TOKEN` (14-char sandbox-proxy-injected tokens) **and**
  via the `Git_CoPilot_MCP` tools. **Admin-scope endpoints (branch protection
  read/write, branch deletion) are hard-blocked** at the proxy level —
  `403 Resource not accessible by integration` on `GET/PUT
  .../branches/develop/protection`, same error via both raw REST and after
  the user "fixed" MCP auth (which did fix `get_me`'s identity resolution,
  but that's unrelated — there's no branch-protection tool in
  `Git_CoPilot_MCP` at all, and the underlying proxy-token restriction is
  separate from MCP-level auth). Don't keep retrying this class of call
  hoping a token fix will unblock it — it won't, from this sandbox.
- **`Git_CoPilot_MCP__issue_write`'s `method` param does not accept
  `add_comment`** — use the dedicated `mcp__Git_CoPilot_MCP__add_issue_comment`
  tool instead (discovered this session; the schema had drifted from an
  earlier version). If that MCP tool 403s, fall back to raw `curl -X POST
  .../issues/{n}/comments` with `$GITHUB_TOKEN` — that path works.
- **`git fetch origin <branch>` alone is unreliable for updating local
  remote-tracking refs** in this sandbox — use the explicit refspec form:
  `git fetch origin +refs/heads/<branch>:refs/remotes/origin/<branch>
  --force`. Confirmed again this session.
- Two separate Supabase projects, two separate Render backends, two separate
  Vercel-served domains — see `CLAUDE.md` § Deployment and § Key
  Infrastructure for the full PROD/DEV split. Always confirm which one
  you're actually writing to before inserting test data.

## Suggested next steps (in priority order)

0. **#1072 root cause is done; what's left needs a human decision.** Region
   mismatch (Render `oregon` vs. Supabase `us-east-1`, confirmed on both
   prod and dev) is the confirmed cause; migration 034 (a partial code fix,
   RPC-based round-trip collapse) is written and unit-tested but not applied
   to DEV or PROD. Next: get go-ahead to apply to DEV, re-measure, then PROD,
   then decide whether Render/Supabase colocation is worth doing or the
   revised budget gets accepted instead. See the section at the top of this
   doc for the full state.
1. Otherwise, this is a watch-and-wait phase. Keep using the app under the
   API-driven flags as real day-to-day usage, not synthetic test scenarios,
   and periodically re-check the five Mixpanel events against the
   39/33/9/11/1 baseline above.
2. When there's enough monitoring-window signal (or a deliberate decision to
   stop waiting), decide: does R4 need a real second user? If yes, `
   fetchTeamFlags` needs to be built first — scope that as its own piece of
   work, not a quick DB insert.
3. If/when R4's evidence bar is met AND #1072 is resolved or explicitly
   accepted, that's the point to plan R5 (default-on cutover) — acceptance
   thresholds should be defined explicitly before flipping `API_DRIVEN_HOME`
   on for everyone, not inferred from R4 in hindsight.
4. Re-enable `develop`'s soak-lock branch protection before the *next*
   release cycle's promote-and-sync dance needs it — only if/when KK asks;
   it's deliberately left off for now.

## Reference docs

- `docs/product/API_DRIVEN_ARCHITECTURE_REDESIGN.md` — the baseline
  architecture doc; §17 defines the release ladder (R0-R6), §29.2 defines
  the acceptance thresholds referenced above.
- `docs/product/ROADMAP.md` — v3.3.3 release-candidate entry (should already
  be reconciled to "promoted" by the time you read this — re-check it hasn't
  drifted back to release-candidate language now that the promote is real).
- `CLAUDE.md` § Current Version — full v3.3.3 changelog entry with every PR
  reference.
- GitHub #1033 — the living rollout tracker; read its comment thread in full
  before adding to it, the two Mixpanel-baseline comments above are the most
  recent and most load-bearing.
