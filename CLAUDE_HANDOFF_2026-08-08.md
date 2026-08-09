# Role & Access Model Evolution — Coordination File

Shared by T1 and T2. Each side edits only its own `## T1 Notes` / `## T2 Notes`
section. Post cross-side asks in `## Requests`. Reconcile conflicts on pull —
never force-push over the other side's section.

**Canonical working branch for this entire initiative: `claude/role-access-model-evolution-8a855d`**
(confirmed by KK, 2026-08-08). This file lives at the repo root on that branch.
`develop`/`main` are off-limits all session — soak window, no exceptions.

**Reconciliation note (2026-08-08):** T1 and T2 each independently created this
file at the same path on their own branches, so PR #658 (T2's branch →
this one) hit an add/add conflict here. Resolved by hand, folding T2's
Status Table rows, T2 Notes execution log, and Requests confirmation into
this canonical copy — nothing from either side's content was dropped. T2's
own note that it "stays on its own branch, reconciliation happens at
squash-merge time" describes exactly this moment.

---

## Lessons (both sides — read before your next commit/PR)

- **ROADMAP Story numbers and GitHub issue numbers are independent
  sequences — always resolve the real issue number after filing, never
  assume they match, before writing any refs/closes in a commit message.**
  T2 independently hit and self-corrected this same trap (wrote `refs #124`
  assuming Story 124 == issue #124; #124 is a real, unrelated, pre-existing
  issue — "Story 57: PR conflict-resolution playbook"). Caught before
  pushing. T1's commits were checked and were already correct. Two
  independent near-misses on the same mistake in one session — treat this
  as a real, recurring trap, not a one-off.
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
- **A shared coordination-file path invites add/add conflicts once both
  sides commit independently.** Not worth restructuring mid-session, but
  worth naming: if this pattern is reused on a future two-terminal
  initiative, consider having only the canonical-branch side own the file
  and the other side post updates via `## Requests`-style append-only notes
  instead of a full parallel copy.

---

## Status Table

| Story/Task | Owner | State | Last updated by | Timestamp |
|---|---|---|---|---|
| Story A (role vocab reconciliation) | — | **DROPPED** — recon found WS-1/#336 + `normalizeRole.js` already resolved this; no issue filed | T1 | 2026-08-08 |
| Story 124 (teams search + request-access discovery) | T1 (backend) / T2 (frontend) | **Filed: [#655](https://github.com/kaushikkuberanathan/lineup_generator/issues/655)** | T1 | 2026-08-08 |
| Story 125 (Phase 4C role-scoped data model) | — | **Filed: [#656](https://github.com/kaushikkuberanathan/lineup_generator/issues/656)**, `status:blocked` | T1 | 2026-08-08 |
| `GET /api/v1/teams/search` (backend) | T1 | **Done** — squash-merged into working branch via [PR #657](https://github.com/kaushikkuberanathan/lineup_generator/pull/657) (`c40af13`). 120/120 unit tests passing (111 existing + 9 new, `teamsSearch.route.test.js`). `docs/SOLUTION_DESIGN.md` Route Inventory updated. | T1 | 2026-08-08 |
| Story 124 (#655) — RequestAccessScreen role picker | T2 | **Done** — 3→5 options, correct vocab incl. parent→viewer, 7 tests, mutation-verified | T2 | 2026-08-08 |
| Story 124 (#655) — Home tab `TeamSearch` component | T2 | **Done** — loading/error/empty/populated/offline states, 8 tests, mutation-verified | T2 | 2026-08-08 |
| Story 124 (#655) — `requestAccess()` session-safety fix | T2 | **Done** — additive `preserveSession` option (default off, zero effect on existing call sites), 5 hook tests, RED→GREEN | T2 | 2026-08-08 |
| Story 124 (#655) — wire search entry point into `App.jsx` `renderHome()` | T2 | **Done** — gate phrase received, purely additive diff (0 deletions), build+lint clean, role-picker portion live-browser-verified; the auth-gated search→role-picker handoff relies on test coverage (26 tests) rather than live browser, per KK's explicit acceptance — see T2 Notes | T2 | 2026-08-08 |
| Story 124 (#655) frontend + backend reconciliation | T1 | **Done** — [PR #658](https://github.com/kaushikkuberanathan/lineup_generator/pull/658) (T2's branch → this branch) squash-merged, this file's add/add conflict resolved by hand. Both halves of Story 124 now live on one branch. | T1 | 2026-08-08 |
| `CLAUDE.md` role-vocab correction | T1 | **Done** — KK gave the gate phrase, additive closing note committed (`7e660e8`, refs #655). No correction was needed; existing section was already accurate. | T1 | 2026-08-08 |

**Story 124 (#655) is now fully reconciled on `claude/role-access-model-evolution-8a855d`** —
backend route, frontend role picker, search component, session-safety fix, and
`App.jsx` wiring are all present on one branch, all tested. Ready for KK's
review whenever the soak window closes. No PR against `develop` opened or
planned this session.

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

**2026-08-08, session close (backend) — T1 done with the backend piece.**

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
- `App.jsx`, `frontend/package.json`, `backend/package.json` — **not touched**
  at this point in the session, confirmed via `git diff --stat`.
- `CLAUDE.md` — **not edited yet at this point.** Held diff is additive-only
  (one closing bullet). On inspection the existing role-vocabulary section
  was already fully accurate — no staleness found.
- Incident (self-caught, fully resolved): mid-session, an Edit tool call
  used a bare-repo path instead of the worktree path and landed an
  uncommitted change on the **main repo's `develop` checkout** — see
  `## Lessons` above for the full account. Nothing was ever committed or
  pushed to `develop`; both the worktree's commits and `develop`'s working
  tree were swept and verified clean before continuing.
- `develop`/`main`: not pushed to, no PR opened, no PR planned this session.

**2026-08-08, later same session — CLAUDE.md gate phrase received, then
reconciliation with T2's branch.**

- KK gave the literal gate phrase `"all clear — App.jsx editing approved"`
  and `"all clear — CLAUDE.md editing approved"` earlier in-session (for the
  CLAUDE.md addition specifically). Committed the held additive note to
  `CLAUDE.md`'s Multi-team design section (`7e660e8`, refs #655).
- KK then confirmed T2's frontend branch (`claude/story-b-frontend-role-
  access-f0730f`) was complete and idle, and directed reconciliation onto
  this branch. Pushed T2's branch to origin (it hadn't been pushed yet),
  opened [PR #658](https://github.com/kaushikkuberanathan/lineup_generator/pull/658),
  attempted a squash-merge via the GitHub API with explicit `merge_method:
  "squash"` — got a 405 "Pull Request has merge conflicts" (this file,
  add/add — both branches created it independently). Resolved locally via
  `git merge --squash origin/claude/story-b-frontend-role-access-f0730f`,
  hand-merged this one conflicting file (see the file's own reconciliation
  note at the top), committed directly to this branch with a message
  referencing both the frontend work and #655, and closed PR #658 via the
  API with a comment explaining the manual resolution (the PR's diff was
  fully applied, just not through GitHub's own merge button given the
  conflict).
- Ran the full frontend suite on this branch's new HEAD after the merge
  (commit `3a43939`). First run: 87 files / 1003 passed + 1 skipped, plus
  one `[vitest-pool]` "Timeout waiting for worker to respond" unhandled
  error on `attendance.test.js` — exactly the documented Bug #7 Windows
  cold-start flake signature (dropped file count, passing exit code, not a
  real failure). Retried per the standing convention ("one retry has always
  cleared it") — clean the second time: **88/88 files, 1048 passed + 1
  skipped (1049 total), 0 failures, 0 errors.** 87→88 files confirms
  `attendance.test.js` was the dropped file both times, not a regression
  from the merge.
- Diff-completeness check on the squash-equivalent commit (KK asked for
  this explicitly): compared `3a43939`'s diff against my pre-merge HEAD to
  T2's full branch diff (`06030c1`..`d280cc4`, their own "7 commits"
  summary). Every code file matches in both diff stat AND git blob hash —
  `App.jsx`, `useAuth.js`, `TeamSearch.jsx`+test, `RequestAccessScreen.jsx`
  +test, `useAuth.requestAccess.test.js` all byte-identical between the two
  branches' versions. Only this coordination file legitimately differs
  (hand-reconciled merge of both sides' notes, not a raw copy — expected).
  Nothing missing, nothing duplicated.
- PR #658 closed (not merged via the button, since the actual content was
  already applied via the manual squash commit) with two comments: one
  explaining the manual resolution, one pointing at the exact final SHA
  (`3a43939`) with the byte-hash verification result, for anyone auditing
  PR history later where GitHub shows "Closed" rather than "Merged."
- `develop`/`main`: still not pushed to, still no PR opened, still none
  planned this session — unchanged, absolute, soak-window-driven.

---

## T2 Notes

**2026-08-08** — Execution log:

1. Fixed `RequestAccessScreen.jsx` `ROLE_OPTIONS`: 3 → 5 entries (Head Coach/
   team_admin with a manual-review note, Assistant Coach/coach, Team
   Coordinator/coordinator, Scorekeeper/scorekeeper — re-added as a
   self-service option per KK's explicit in-session call, Parent-Family/
   viewer — genuinely new). Added `htmlFor`/`id` label association (a11y +
   testability gap found along the way). 7 tests, RED→GREEN via mutation
   test (reverted `coordinator` back to its old `coach` mapping, confirmed
   the test catches it).

2. Corrected a stale comment in that same file claiming "Story A is expected
   to give team_admin/coordinator their own canonical values" — Story A is
   dropped; team_admin→admin and coordinator→coach (Option B) is the
   deliberate, accepted state per T1's Notes + issue #656's body. Comment
   now correctly cites #656 as the deferred-not-resolved decision.

3. Built `TeamSearch.jsx` (`components/Home/`) — debounced (400ms) search
   against `GET /api/v1/teams/search`, covers loading/error/empty/populated/
   offline. Empty state includes a real next step (not a dead end). 8 tests;
   mutation-tested (`MIN_QUERY_LENGTH` 2→1, confirmed RED, restored).

4. Found and fixed a real correctness bug: `useAuth.js`'s `requestAccess()`
   unconditionally called `setAuthState('pending_approval')` and overwrote
   `lg_team_id`/`lg_pending_email` on success. Reused as-is from the
   already-authenticated Home tab "add a second team" flow, this would have
   kicked a logged-in coach out to the pending-approval screen. Added an
   additive `preserveSession` option (default off, zero effect on every
   existing call site — confirmed via the destructuring default, not just
   asserted). 5 new hook-level tests (zero prior coverage existed for this
   function's real implementation), RED confirmed before the fix (cases 3-4
   failed exactly as predicted), GREEN after. Smoke-checked
   `AppNoMembershipRouting.test.jsx` + `AppShareLinkRouting.test.jsx` (8/8
   still pass) even though those mock `useAuth()` wholesale and can't
   directly catch a regression here.

5. Filed two notes on issue #655 directly: the Scorekeeper reversal decision
   (in-session call, not deferred, no schema implications) and the
   session-safety acceptance criterion for the search+request flow.

6. Wired the search entry point into `App.jsx`'s `renderHome()` after
   receiving the literal gate phrase from KK: two new `homeMode` branches
   ("search" → `TeamSearch`, "requestAccess" → `RequestAccessScreen` with
   the tapped team preselected and `preserveSession={true}`), plus a
   `discoveredTeam` state var and the `TeamSearch` import. Purely additive
   diff (0 deletions) — confirmed via `git diff`. `npm run build` and
   `npm run lint` both clean (two `react/no-unescaped-entities` errors from
   raw apostrophes in JSX text, fixed with `&apos;`, re-verified clean).

   Live-browser-verified the role-picker portion via the unauthenticated
   `/request-access` path (Google/magic-link screen → "Request access") —
   all 5 options render, Head Coach's manual-review note shows correctly.
   Could not live-browser-verify the authenticated search → select-team →
   role-picker handoff itself: reaching it needs a session, and the app's
   documented dev-only `auth_bypass` localStorage flag couldn't be set via
   browser automation in this session (blocked by the harness's own
   permission classifier, not a code issue). Asked KK directly; accepted
   test coverage (26 passing component/hook tests + 41 App-level smoke
   tests) as sufficient rather than working around the block.

**Story 124's (#655) frontend piece is fully done and committed.** No
outstanding blockers on T2's side. (T2's own branch copy of this file also
independently caught the Story-number-vs-issue-number trap — see `## Lessons`
above.)

---

## Requests

**RESOLVED, 2026-08-08 — branch topology.** Earlier note in this section
asked T2 to retarget onto a "canonical branch." That was T1 overreaching —
KK clarified: T2's branch (`claude/story-b-frontend-role-access-f0730f`) was
intentionally independent and squash-merged into
`claude/role-access-model-evolution-8a855d` later (PR #658, resolved by hand
due to this file's own add/add conflict), the same way T1's
`issue/655-teams-search-endpoint` did via PR #657. It was never supposed to
match a shared name. Fully closed now — reconciliation is done, not just
settled-in-principle.

**RESOLVED, 2026-08-08 — frontend parent/viewer gap.** T2 shipped this:
`RequestAccessScreen.jsx`'s `ROLE_OPTIONS` expanded from 3 to 5 entries,
including `parent → viewer`. Confirmed by reading the commit directly and
now merged onto this branch.

**T2 → T1, 2026-08-08 (from T2's branch copy, folded in here):** No open
asks — the parent/viewer gap and Scorekeeper reversal were both decided
directly with KK in-session. Nothing outstanding from T2's side.

No open requests from either side as of the reconciliation.

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
- **Consumer:** `frontend/src/components/Home/TeamSearch.jsx` (T2) — built
  against this exact contract shape, debounced 400ms.

### Role vocabulary (current, confirmed live — for reference, not new work)

- DB `team_memberships.role` CHECK: 7 values — `admin, viewer, team_admin,
  coordinator, coach, scorekeeper, parent` (all already valid, live).
- Code-level canonical set (`normalizeRole.js`): 4 values — `admin, coach,
  scorekeeper, viewer`. `team_admin→admin`, `coordinator→coach`, `parent→viewer`.
  This is deliberate (Option B) and stays as-is per KK's 2026-08-08 decision.
- Frontend `ROLE_OPTIONS` (`RequestAccessScreen.jsx`): **updated 2026-08-08 by
  T2** (commit `e363200`, now merged onto this branch) to 5 entries —
  `head_coach→team_admin` (manual-review flagged), `assistant_coach→coach`,
  `coordinator→coordinator`, `scorekeeper→scorekeeper`, `parent→viewer`.
  The 3-entry/no-parent-option gap noted earlier in this file is closed.
