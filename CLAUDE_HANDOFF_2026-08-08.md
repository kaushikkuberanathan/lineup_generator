# Role & Access Model Evolution — Coordination File

Shared by T1 and T2. Each side edits only its own `## T1 Notes` / `## T2 Notes`
section. Post cross-side asks in `## Requests`. Reconcile conflicts on pull —
never force-push over the other side's section.

**Canonical working branch for this entire initiative: `claude/role-access-model-evolution-8a855d`**
(confirmed by KK, 2026-08-08). This file lives at the repo root on that branch.
`develop`/`main` are off-limits all session — soak window, no exceptions.

---

## Lessons (both sides — read before your next commit/PR)

- **ROADMAP Story numbers and GitHub issue numbers are independent
  sequences — always resolve the real issue number after filing, never
  assume they match, before writing any refs/closes in a commit message.**
  (T2 caught this for their own commits 2026-08-08; T1's commits were checked
  and were already correct, but the mistake is easy to make either direction.)
- **Edit/Write/Read tool calls are not automatically scoped to the worktree —
  verify the absolute path on every call, not just when something looks
  wrong.** T1 passed a bare-repo path (`C:\Users\...\lineup-generator\backend\...`
  instead of `C:\Users\...\lineup-generator\.claude\worktrees\
  role-access-model-evolution-8a855d\backend\...`) to Edit while implementing
  the `/teams/search` route, landing an uncommitted change on the **main
  repo's `develop` checkout** — the one branch this whole initiative is
  forbidden from touching. Caught via `git hash-object` mismatch (Bash-tool
  git commands stayed correctly scoped to the worktree throughout — only
  Edit/Read had drifted), swept both worktree commits and the main repo's
  `develop` status clean afterward on 2026-08-08, nothing was ever committed
  or pushed on `develop`. From this point on: state the full absolute path
  out loud before every Edit/Write/Read call and confirm it starts with
  `...\.claude\worktrees\role-access-model-evolution-8a855d\`.

---

## Status Table

| Story/Task | Owner | State | Last updated by | Timestamp |
|---|---|---|---|---|
| Story A (role vocab reconciliation) | — | **DROPPED** — recon found WS-1/#336 + `normalizeRole.js` already resolved this; no issue filed | T1 | 2026-08-08 |
| Story 124 (teams search + request-access discovery) | T1 (backend) / T2 (frontend) | **Filed: [#655](https://github.com/kaushikkuberanathan/lineup_generator/issues/655)** | T1 | 2026-08-08 |
| Story 125 (Phase 4C role-scoped data model) | — | **Filed: [#656](https://github.com/kaushikkuberanathan/lineup_generator/issues/656)**, `status:blocked` | T1 | 2026-08-08 |
| `GET /api/v1/teams/search` (backend) | T1 | **Done** — squash-merged into working branch via [PR #657](https://github.com/kaushikkuberanathan/lineup_generator/pull/657) (`c40af13`). 120/120 unit tests passing (111 existing + 9 new, `teamsSearch.route.test.js`). `docs/SOLUTION_DESIGN.md` Route Inventory updated. | T1 | 2026-08-08 |
| Role picker / search UI (frontend) | T2 | In progress locally (2 commits: role-picker vocab fix, Home tab search component) — not yet pushed to origin as of last check | — | 2026-08-08 |
| `CLAUDE.md` role-vocab correction | T1 (holding diff) | **Not committed** — needs literal gate phrase from KK. On inspection the existing section was already accurate; the held diff is additive-only (one closing note), see T1 Notes. | T1 | 2026-08-08 |

---

## T1 Notes

**2026-08-08** — Phase 1 recon found Story A's premise didn't match current
`develop`: WS-1/#336 already fixed the approve-link crash and the missing-viewer
gap via `backend/src/lib/normalizeRole.js` (single source of truth, 4 canonical
roles: admin/coach/scorekeeper/viewer). The DB CHECK already permits all 7
legacy values live (`docs/db/schema.sql:190-193`). KK confirmed: drop Story A
entirely, keep Option B (coordinator stays a label → coach), defer the Option
A/B re-decision to Story 125 until Phase 4C unblocks.

KK also confirmed: no migration needed (nothing to migrate — CHECK already
permits everything), no edits to `auth.js`/`admin.js` (already correct), and
characterization tests for `normalizeRole` at both the unit level
(`normalizeRole.test.js`) and route level (`requestAccess.role.test.js`,
`approveLink.role.test.js`) **already exist and already cover** coordinator/
team_admin/parent/viewer succeeding and platform_admin/unknown rejected — so
that "optional but recommended" ask from the original handoff is already done,
no new test file needed there.

Working on: Story 124/125 issue filing, then `GET /api/v1/teams/search`
backend implementation only. Will not touch `App.jsx`, `frontend/package.json`,
`backend/package.json`, or `CLAUDE.md` (latter held pending gate phrase).

**2026-08-08, session close — T1 done for this session.**

- Branch: `claude/role-access-model-evolution-8a855d`, HEAD `c40af13`.
- Issues: Story 124 → [#655](https://github.com/kaushikkuberanathan/lineup_generator/issues/655),
  Story 125 → [#656](https://github.com/kaushikkuberanathan/lineup_generator/issues/656). Story A
  dropped, not filed.
- `GET /api/v1/teams/search` shipped exactly to the published contract:
  `q`/`ageGroup`/`sport` query params, response is a flat array of
  `{id, name, age_group, sport, year}` (never `owner_id`), 400 on
  injection-shaped input, rate-limited by IP (`express-rate-limit`, 15 min
  window, max 20 — settled the "TBD" keying question from the original
  contract draft: no email/identity exists on this route, so IP is the only
  option). Mounted automatically at both `/api/v1/teams/search` and legacy
  `/api/teams/search` (existing dual-mount on `teamData.js`).
  9 new tests in `backend/src/__tests__/teamsSearch.route.test.js`.
  `docs/SOLUTION_DESIGN.md` Route Inventory row added.
- `App.jsx`, `frontend/package.json`, `backend/package.json` — **not touched**,
  confirmed via final `git diff --stat` against the working branch.
- `CLAUDE.md` — **not edited.** Held diff is in my session's scratch space,
  not this repo (KK: ask T1 to re-paste it if this session ends before you
  give the gate phrase). On inspection the existing role-vocabulary section
  (lines 63-72) was already fully accurate — no staleness found. The held
  diff is purely additive: one closing bullet recording that Story A was
  investigated and dropped this session, so a future reader doesn't
  re-discover the same non-bug.
- Incident (self-caught, fully resolved): mid-session, an Edit tool call
  used a bare-repo path instead of the worktree path and landed an
  uncommitted change on the **main repo's `develop` checkout** — see
  `## Lessons` above for the full account. Nothing was ever committed or
  pushed to `develop`; both the worktree's commits and `develop`'s working
  tree were swept and verified clean before continuing.
- `develop`/`main`: not pushed to, no PR opened, no PR planned this session.
  **PR to develop intentionally not opened — develop is mid soak window,
  awaiting KK's explicit instruction.**
- Open, for T2 or KK: (1) the branch-name mismatch flagged in `## Requests`
  below — as of last check T2 has 2 local commits on
  `claude/story-b-frontend-role-access-f0730f`, not yet pushed anywhere; (2)
  the CLAUDE.md gate phrase, whenever KK is ready; (3) the parent/viewer
  frontend gap flagged in `## Requests` below, if T2's Story 124 scope needs it.

---

## T2 Notes

*(reserved for T2 — do not edit)*

---

## Requests

**T1 → T2, 2026-08-08:** Your worktree (`.claude/worktrees/story-b-frontend-role-access-f0730f`)
is on branch `claude/story-b-frontend-role-access-f0730f`, still at the shared
base commit (`06030c1`), not yet pushed to origin. KK has designated
`claude/role-access-model-evolution-8a855d` (my branch) as the **single
canonical working branch for this whole initiative** — please retarget your
work to push into that branch (or open your PR against it) rather than your
own branch name, so everything lands in one place for the eventual (KK-only,
post-soak) promote to develop. If you've already started committing on your
own branch, that's fine — just merge/rebase onto
`claude/role-access-model-evolution-8a855d` before pushing, rather than
maintaining two parallel branches for one initiative.

**T1 → T2, 2026-08-08:** Story A is dropped — do not build anything against
the original handoff's 4-role/5-role assumptions. Current reality (verified
against live `develop`):
- Backend already accepts `admin/coach/scorekeeper/viewer/team_admin/coordinator/parent`
  at `/request-access` via `normalizeRole()` — nothing to change there.
- Frontend `RequestAccessScreen.jsx` `ROLE_OPTIONS` today has only **3** entries
  (`head_coach→admin`, `assistant_coach→coach`, `coordinator→coach`) — no
  viewer/parent option exists in the UI. If your Story 124 frontend scope
  includes exposing a parent/viewer request path, that's a real gap to design,
  not a wiring bug — flag back here if you want my read on it before building.

---

## Contracts

### `GET /api/v1/teams/search` (backend — T1, **shipped**, PR #657, `c40af13`)

- **Auth:** none required (public, unauthenticated — same risk class as `/magic-link`)
- **Rate limit:** IP-keyed (`express-rate-limit` + `ipKeyGenerator`), 15 min
  window, max 20. Resolved the earlier "TBD" keying question — this route has
  no email/identity to key on the way `loginLimiter` does, so IP is the only
  option; 20/15min is looser than `loginLimiter`'s 5/15min since search is
  lower-risk than an auth attempt.
- **Query params:** `q` (name substring, `ilike`), `ageGroup` (exact match),
  `sport` (exact match). All optional; no params = no filter, still bounded by
  a row limit. All three: max 100/50/50 chars, must match
  `/^[\w\s'&.-]*$/` — anything else (SQL-metacharacter-shaped, `<script>`,
  etc.) is rejected with `400 VALIDATION_ERROR` before the DB is touched.
- **Response:** `200 OK`, JSON array of objects:
  ```json
  [{ "id": "...", "name": "...", "age_group": "...", "sport": "...", "year": 2026 }]
  ```
  **`owner_id` is never included** — the Supabase `.select()` call only
  requests those 5 columns. No pagination envelope — flat array, `limit(50)`.
- **Mount:** available at both `/api/v1/teams/search` and legacy
  `/api/teams/search` (existing dual-mount already on `teamData.js`).
- **Tests:** `backend/src/__tests__/teamsSearch.route.test.js` (9 tests) —
  no-auth success, `owner_id` never leaks, empty/single/multi-field filters,
  injection-shaped `q`/`ageGroup` rejected, DB error surfaces as 500 (not a
  silent empty array), dual-mount smoke.

### Role vocabulary (current, confirmed live — for reference, not new work)

- DB `team_memberships.role` CHECK: 7 values — `admin, viewer, team_admin,
  coordinator, coach, scorekeeper, parent` (all already valid, live).
- Code-level canonical set (`normalizeRole.js`): 4 values — `admin, coach,
  scorekeeper, viewer`. `team_admin→admin`, `coordinator→coach`, `parent→viewer`.
  This is deliberate (Option B) and stays as-is per KK's 2026-08-08 decision.
- Frontend `ROLE_OPTIONS` (`RequestAccessScreen.jsx`): 3 entries today, IDs
  `head_coach`, `assistant_coach`, `coordinator` — values map to `admin`/`coach`/`coach`.
  No parent/viewer option exists in the UI yet.
