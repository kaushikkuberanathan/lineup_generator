# Role & Access Model Evolution — Coordination File

Shared by T1 and T2. Each side edits only its own `## T1 Notes` / `## T2 Notes`
section. Post cross-side asks in `## Requests`. Reconcile conflicts on pull —
never force-push over the other side's section.

**Canonical working branch for this entire initiative: `claude/role-access-model-evolution-8a855d`**
(confirmed by KK, 2026-08-08). This file lives at the repo root on that branch.
`develop`/`main` are off-limits all session — soak window, no exceptions.

---

## Status Table

| Story/Task | Owner | State | Last updated by | Timestamp |
|---|---|---|---|---|
| Story A (role vocab reconciliation) | — | **DROPPED** — recon found WS-1/#336 + `normalizeRole.js` already resolved this; no issue filed | T1 | 2026-08-08 |
| Story 124 (teams search + request-access discovery) | T1 (backend) / T2 (frontend) | **Filed: [#655](https://github.com/kaushikkuberanathan/lineup_generator/issues/655)** | T1 | 2026-08-08 |
| Story 125 (Phase 4C role-scoped data model) | — | **Filed: [#656](https://github.com/kaushikkuberanathan/lineup_generator/issues/656)**, `status:blocked` | T1 | 2026-08-08 |
| `GET /api/v1/teams/search` (backend) | T1 | In progress | T1 | 2026-08-08 |
| Role picker / search UI (frontend) | T2 | Unknown — see Requests | — | — |
| `CLAUDE.md` role-vocab correction | T1 (holding diff) | **Not committed** — needs literal gate phrase from KK | T1 | 2026-08-08 |

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

### `GET /api/v1/teams/search` (backend — T1, in progress)

- **Auth:** none required (public, unauthenticated — same risk class as `/magic-link`)
- **Rate limit:** same `loginLimiter` pattern (express-rate-limit, 15 min window,
  max 5), keyed by... TBD — see note below, this route has no email/identity to
  key on the way `/magic-link` does. Defaulting to IP-keyed via `ipKeyGenerator`.
- **Query params:** `q` (name substring match, optional), `ageGroup` (exact
  match, optional), `sport` (exact match, optional). All optional; no params =
  no filter (bounded by a max row count, TBD in implementation).
- **Response:** `200 OK`, JSON array of objects:
  ```json
  [{ "id": "...", "name": "...", "age_group": "...", "sport": "...", "year": 2026 }]
  ```
  **`owner_id` is never included.** No pagination envelope — flat array.
- **Errors:** malformed/injection-shaped query params are rejected with `400`,
  not sanitized-and-run.

### Role vocabulary (current, confirmed live — for reference, not new work)

- DB `team_memberships.role` CHECK: 7 values — `admin, viewer, team_admin,
  coordinator, coach, scorekeeper, parent` (all already valid, live).
- Code-level canonical set (`normalizeRole.js`): 4 values — `admin, coach,
  scorekeeper, viewer`. `team_admin→admin`, `coordinator→coach`, `parent→viewer`.
  This is deliberate (Option B) and stays as-is per KK's 2026-08-08 decision.
- Frontend `ROLE_OPTIONS` (`RequestAccessScreen.jsx`): 3 entries today, IDs
  `head_coach`, `assistant_coach`, `coordinator` — values map to `admin`/`coach`/`coach`.
  No parent/viewer option exists in the UI yet.
