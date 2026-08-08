# Role & Access Model Evolution — Coordination File (T2's copy)

**This is T2's own-branch copy, not the canonical file.** Per KK (2026-08-08):
T2 stays on `claude/story-b-frontend-role-access-f0730f` for this whole session
rather than retargeting to T1's branch — see the branch-topology note below.
Reconcile this file's `## T2 Notes` into T1's canonical copy on
`claude/role-access-model-evolution-8a855d` when T2's branch eventually
squash-merges into it. `develop`/`main` are off-limits all session — soak
window, no exceptions.

---

## Branch topology note (flag for T1, 2026-08-08)

ROADMAP "Story" numbers and GitHub issue numbers are **independent
sequences** — they are not the same number. T2 initially wrote `refs #124`
in a commit message assuming "Story 124" == issue #124; issue #124 is a real,
unrelated, pre-existing issue in this repo ("Story 57: PR conflict-resolution
playbook"). The correct issue for this work is **#655** ("Story 124: Home tab
team search + request-access discovery"). Caught and amended (unpushed commit,
safe to amend) before it went anywhere. Worth T1 double-checking its own
commits for the same mistake — the same trap applies to #656/Story 125.

Also: T1's canonical-copy note asked T2 to retarget onto
`claude/role-access-model-evolution-8a855d`. KK, asked directly, confirmed T2
stays on its own branch (`claude/story-b-frontend-role-access-f0730f`) instead
— reconciliation happens at squash-merge time, not now. Not a disagreement
with T1's read of the situation, just KK's live call superseding an
earlier-written note.

---

## Status Table (T2's view — may drift from T1's canonical copy)

| Story/Task | Owner | State | Last updated by | Timestamp |
|---|---|---|---|---|
| Story A (role vocab reconciliation) | — | DROPPED (per T1 Notes on canonical branch) | T1 | 2026-08-08 |
| Story 124 (#655) — RequestAccessScreen role picker | T2 | **Done** — 5 options, correct vocab, 7 tests, mutation-verified | T2 | 2026-08-08 |
| Story 124 (#655) — Home tab TeamSearch component | T2 | **Done** — loading/error/empty/populated/offline, 8 tests, mutation-verified | T2 | 2026-08-08 |
| Story 124 (#655) — requestAccess() session-safety fix | T2 | **Done** — `preserveSession` option, additive, 5 hook tests, RED->GREEN, App-level smoke check clean | T2 | 2026-08-08 |
| Story 124 (#655) — wire search entry point into `App.jsx` renderHome() | T2 | **Blocked** — needs literal gate phrase "all clear — App.jsx editing approved" from KK | T2 | 2026-08-08 |
| `GET /api/v1/teams/search` (backend) | T1 | See T1's canonical copy | T1 | 2026-08-08 |

---

## T1 Notes

*(not duplicated here — see the canonical copy on `claude/role-access-model-evolution-8a855d`)*

---

## T2 Notes

**2026-08-08** — Execution log:

1. Fixed `RequestAccessScreen.jsx` `ROLE_OPTIONS`: 3 -> 5 entries (Head Coach/
   team_admin with a manual-review note, Assistant Coach/coach, Team
   Coordinator/coordinator, Scorekeeper/scorekeeper — re-added as a
   self-service option per KK's explicit in-session call, Parent-Family/
   viewer — genuinely new). Added `htmlFor`/`id` label association (a11y +
   testability gap found along the way). 7 tests, RED->GREEN via mutation
   test (reverted `coordinator` back to its old `coach` mapping, confirmed
   the test catches it).

2. Corrected a stale comment I wrote in that same file claiming "Story A is
   expected to give team_admin/coordinator their own canonical values" —
   Story A is dropped; team_admin->admin and coordinator->coach (Option B)
   is the deliberate, accepted state per T1's Notes + issue #656's body.
   Comment now correctly cites #656 as the deferred-not-resolved decision.

3. Built `TeamSearch.jsx` (`components/Home/`) — debounced (400ms) search
   against `GET /api/v1/teams/search`, covers loading/error/empty/populated/
   offline. Empty state includes a real next step (not a dead end). 8 tests;
   mutation-tested (`MIN_QUERY_LENGTH` 2->1, confirmed RED, restored).
   Not yet wired into `App.jsx` — blocked on the gate phrase.

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

**Still blocked, waiting on KK directly (not inferable, not relayable):**
"all clear — App.jsx editing approved" — needed to wire the "Don't see your
team? Search for one" entry point into `renderHome()`. Everything else this
session's scope requires is done and committed on
`claude/story-b-frontend-role-access-f0730f`.

---

## Requests

**T2 -> T1, 2026-08-08:** No open asks right now — your `## Requests` note
about the parent/viewer gap being "a real design gap, not a wiring bug" is
resolved; KK and I decided that directly in-session (Parent/Family -> viewer,
Scorekeeper re-added too). See Status Table above for what's done.

---

## Contracts

*(not duplicated here — see the canonical copy on `claude/role-access-model-evolution-8a855d` for the `GET /api/v1/teams/search` contract; `TeamSearch.jsx` was built against that contract's documented shape: `q`/`ageGroup`/`sport` query params, flat array response, no `owner_id`, no pagination envelope)*
