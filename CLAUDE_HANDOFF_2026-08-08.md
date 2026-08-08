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
| Story 124 (#655) — wire search entry point into `App.jsx` renderHome() | T2 | **Done** — gate phrase received, purely additive diff (0 deletions), build+lint clean, role-picker portion live-browser-verified; the auth-gated search→role-picker handoff itself relies on test coverage (26 tests) rather than live browser, per KK — see T2 Notes | T2 | 2026-08-08 |
| `GET /api/v1/teams/search` (backend) | T1 | See T1's canonical copy | T1 | 2026-08-08 |

**T2's frontend piece of Story 124 (#655) is fully done and committed** on
`claude/story-b-frontend-role-access-f0730f`. Whether the backend route is
also ready is T1's call, not inferred here — if it is, this is a coordination
point to raise with KK, not something to act on unilaterally either way.

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

6. Wired the search entry point into `App.jsx`'s `renderHome()` after
   receiving the literal gate phrase from KK: two new `homeMode` branches
   ("search" -> `TeamSearch`, "requestAccess" -> `RequestAccessScreen` with
   the tapped team preselected and `preserveSession={true}`), plus a
   `discoveredTeam` state var and the `TeamSearch` import. Purely additive
   diff (0 deletions) — confirmed via `git diff`. `npm run build` and
   `npm run lint` both clean (two `react/no-unescaped-entities` errors from
   raw apostrophes in JSX text, fixed with `&apos;`, re-verified clean).

   Live-browser-verified the role-picker portion via the unauthenticated
   `/request-access` path (Google/magic-link screen -> "Request access") —
   all 5 options render, Head Coach's manual-review note shows correctly.
   Could not live-browser-verify the authenticated search -> select-team ->
   role-picker handoff itself: reaching it needs a session, and the app's
   documented dev-only `auth_bypass` localStorage flag couldn't be set via
   browser automation in this session (blocked by the harness's own
   permission classifier, not a code issue). Asked KK directly; accepted
   test coverage (26 passing component/hook tests + 41 App-level smoke
   tests) as sufficient rather than working around the block.

**Story 124's (#655) frontend piece is fully done and committed** on
`claude/story-b-frontend-role-access-f0730f`. No outstanding blockers on
T2's side.

---

## Requests

**T2 -> T1, 2026-08-08:** No open asks right now — your `## Requests` note
about the parent/viewer gap being "a real design gap, not a wiring bug" is
resolved; KK and I decided that directly in-session (Parent/Family -> viewer,
Scorekeeper re-added too). See Status Table above for what's done.

---

## Contracts

*(not duplicated here — see the canonical copy on `claude/role-access-model-evolution-8a855d` for the `GET /api/v1/teams/search` contract; `TeamSearch.jsx` was built against that contract's documented shape: `q`/`ageGroup`/`sport` query params, flat array response, no `owner_id`, no pagination envelope)*
