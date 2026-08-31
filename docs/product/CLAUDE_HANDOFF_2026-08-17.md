# Handoff — 2026-08-17, T1 → next session (T2 or future T1)

> **Archived handoff.** Preserve the dated coordination record; verify every branch, issue, migration, and production claim against current source and `ROADMAP.md`.

Read this before starting Dugout-track or Phase 4C work. This is the condensed,
actionable version of a long session — full detail is in the git history of the
PRs cited below, not repeated here.

> **Addendum, later the same day (session 2026-08-17-A):** a second, concurrent
> session picked up the "Open items" below — #681, the 3 dependabot PRs, and
> branch/worktree state — the same day this file was written. Updated in place
> rather than left stale; see the `2026-08-17-A` entry in
> `docs/process/SESSION_RETROSPECTIVES.md` for full detail, including three
> live collisions between the two sessions and how each was resolved without
> data loss. The rest of this file (Phase 4C, UX Phase 5, the GRANT-revocation
> design question) is untouched and still current as T1 left it.

---

## What's actually live right now

- **`main` is at `9401126`** (PR #682) — **v2.10.0 promoted 2026-08-17.** Team
  search + request-access discovery (Story 124/#655), RequestAccessScreen
  confirmation fix (Story 126/#665), local `SUPABASE_TARGET` dev toggle (Story
  128/#668), CI bumped Node 20→22 (PR #678), routine dependency bumps
  (express-rate-limit, @vitest/ui, jsdom, @supabase/supabase-js).
- **`develop` is at `20c8323`** as of session 2026-08-17-A's close — 37 commits
  ahead of `main`, all docs/tooling/dependency-hygiene (#681, #695, #702 below),
  nothing user-facing pending. `main` and `develop` were in sync right after the
  promote (post-promote sync PR #683) but have since diverged normally as
  develop work continued — this is expected, not a gap.
- Prod smoke test confirmed same session: backend `/ping` 200 OK (304ms),
  frontend loads clean, both Render and Vercel independently confirmed serving
  the exact promoted commit (not stale cache) via direct deploy-record queries,
  not just a green checkmark.
- **One checklist item not done by a human:** real-device phone smoke test on
  the production deploy. Recommended before/soon after reading this, per the
  Pre-release Docs Checklist's own "DevTools simulation does not replace this"
  rule.

## This session's major threads (chronological)

1. Verified a stale T2 handoff's premise before acting on it (the "Phase 4b
   live-verification" task) — found the described work had already shipped
   weeks earlier. Stood down rather than redo already-done work.
2. Batch-corrected 4 stale `ROADMAP.md` `Status: Open` lines for stories that
   had actually shipped (120, 124, 126, 128) — PR #675.
3. Set up a second git worktree (`lineup-generator-ux`) on this machine for
   the UX track, verified local dev auth works.
4. Investigated and fixed a live GRANT-level gap on the 4 live-scoring tables
   (found during Phase 4C recon) — flagged in `PHASE4C_SCORING_RLS_PROPOSAL.md`
   (PR #676), **still open, see "Lined-up work" below.**
5. Reviewed and merged 3 low-risk dependabot PRs after root-causing their CI
   failures to a shared Node 20→22 engines-floor issue, fixed once (PR #678)
   and unblocked #627/#670 automatically via Dependabot auto-rebase.
6. Full v2.10.0 develop→main promote: Ship Gate + Pre-release Docs Checklist
   walked explicitly, prod smoke test, post-promote sync — PR #682/#683.
7. **Traced and corrected a real doc/reality mismatch**: `PHASE4C_SCORING_RLS_
   PROPOSAL.md` and migration 019's own header both claimed Section A "not
   applied anywhere." Pulled Supabase's raw Postgres logs for the exact
   timestamp and found it genuinely was applied to DEV on 2026-08-15, via the
   Supabase MCP tool, under KK's own account, with an explicit "per KK
   go-ahead" comment embedded in the applied SQL — a real, attributed,
   deliberate action that just never got written back into the docs. Not an
   incident. Corrected both files (PR #685).
8. Corrected two more stale "prepared for promotion" doc lines after the
   actual promote landed (`ROADMAP.md` PR #684, `CLAUDE.md` PR #686) — same
   staleness pattern the repo has been burned by before (v2.9.0 sat wrong for
   a week); caught same-day this time.

## Two operational lessons from tonight, worth internalizing

1. **GitHub's API had real, repeated transient instability tonight** (503 "No
   server currently available" on write endpoints — merges, label calls, job
   reruns). Reads stayed healthy throughout. Pattern: retry with a short
   backoff (~10s) rather than treating the first 503 as a real rejection: every
   one of tonight's 503s cleared within 1-3 retries. If a rerun/action needs
   `actions:write` scope, this token doesn't have it — expect `403` there, not
   `503`, and don't confuse the two failure modes.
2. **This repo's branch protection has `enforcement_level: "non_admins"`.**
   The repo owner's own merges bypass required-status-check blocking entirely
   — a PR can show `mergeable_state: "blocked"` and still merge cleanly via
   the API if you're the owner. Don't take `"blocked"` at face value; it's
   informative, not necessarily gating, depending on who's merging. Verify via
   an actual merge attempt (or `gh api .../branches/main/protection`) rather
   than inferring from `mergeable_state` alone.
3. **Vercel can queue a deployment for a long time** (~16.5 min observed
   tonight, vs. seconds-to-low-minutes for every other deploy this session)
   without it being a broken integration — confirm via Vercel's own API
   (`get_project`/`get_deployment`, cross-check `repoPushedAt` vs `createdAt`)
   before concluding the GitHub↔Vercel webhook is dead.
4. **When a doc's "not applied" claim needs verifying, don't stop at Supabase's
   `list_migrations` tracking table** — this repo runs migrations both via
   dashboard SQL Editor and MCP `apply_migration`, and the tracking table can
   be sparse relative to what's actually live. `query_logs` against
   `postgres_logs` for the exact statement is the real ground truth; it also
   captures who/what ran it (source, user, and often a comment embedded in the
   applied SQL itself) — enough to fully resolve "was this authorized" without
   guessing.

---

## Open items (as of session 2026-08-17-A's close — see addendum above)

| Item | State | Notes |
|---|---|---|
| #674 | **Resolved, closed** | Was unmergeable as-is (`npm install` ERESOLVE — plugin-react 6 needs vite ^8, which wasn't bumped). Fixed properly via PR #702 (vite 6.4.2→8.2.1 + plugin-react 4.7.0→6.0.5, one targeted `overrides` entry for a deeper optional babel/rolldown conflict, full local build+lint+test verification). #674 closed with a pointer to #702. |
| #673 (eslint 8→10) | **Investigated, genuinely blocked** | No published `eslint-plugin-react` release supports eslint 10 (latest `7.37.5` caps at `^9.7`). Not a scope/effort problem — an upstream gap. Findings posted on the PR. Re-check periodically via `npm view eslint-plugin-react peerDependencies`. |
| #623 (react-dom 18→19) | **Parked deliberately** | Real framework major-version upgrade (React 19 breaking changes) against a 10,000-line locked `App.jsx` — needs its own dedicated, explicitly-scoped session, not a routine dependency-bump pass. |
| #681 | **Resolved, merged** | Was two already-written but *uncommitted* onboarding docs (`docs/process/CLAUDE_CODE_HANDOFF.md`, `AGENT_ONBOARDING_SUPPLEMENT.md`) sitting only on this machine's disk — invisible to any other session until committed. One factual error caught and fixed before merge: a claimed `issue/* → feature/* → develop` branch tier, disproven against real PR data (see `SESSION_RETROSPECTIVES.md` 2026-08-17-A for the evidence). The stash mentioned below was resolved as its own PR, #695. |
| GRANT-revocation on scoring tables | **Not drafted** | `anon`/`authenticated` both still hold full TRUNCATE/DELETE/INSERT/UPDATE on all 4 live-scoring tables, DEV and PROD both — confirmed via direct query 2026-08-15 and 2026-08-17. See "Lined-up work" below — this needs its own migration, and it's a real design decision, not a mechanical port of migration 004/021's pattern. |
| Phase 4C shim-removal, steps 2-7 | Blocked | `game-mode/*` gate phrase not granted; also needs KK actively present for the live-scoring soak step (§3 step 3) — same "supervised session" standard as everywhere else in this repo touching live game-day surfaces. |
| `spike/phase4b-slice10-scoping` | Stale remote branch | Predates this session. Has unmerged content relative to `develop` (checked, not investigated further) — likely superseded by the real slice 10 work that shipped in v2.8.5, but not confirmed. Housekeeping candidate, not urgent. |
| `CLAUDE.md` → Active Tracks → UX Track "Next" line | Stale | Still says "Next: Phase 3 — App.jsx component split..." — but `UX_REFACTOR_ROADMAP.md`'s own status line confirms Phase 3 *and* Phase 4 are both 100% complete. Should say Phase 5 (Auth Re-Skin) instead. Small fix, locked file, needs the `CLAUDE.md` gate phrase. |
| `UX_REFACTOR_ROADMAP.md` → Worktree line | Stale | Still says `C:\Users\KKUBERANA1\Documents\lineup-generator-ux` — the actual worktree on this machine is `C:\Users\kaush\OneDrive\Documents\Projects\lineup-generator-ux`. Cosmetic, not blocking, but worth fixing next time that file's touched. |

---

## Lined-up work — next session's queue, in recommended order

### 1. UX Phase 5 — Auth Re-Skin (ready now, no gate needed to start planning)

Per `UX_REFACTOR_ROADMAP.md` §Phase 5: replace the `#2471A3`/`#2980B9`
auth-screen palette (deliberately preserved as drift since Phase 1, specifically
for this phase) with the canonical design-token system. **Its own stated
dependency — "Phase 4 complete" — is now genuinely satisfied** (var C
retirement finished v2.8.5, confirmed zero `C.*` references remain in
`App.jsx`). This is the correct next phase in the UX track's own sequence.

**Scope boundary, stated explicitly in the roadmap doc, worth repeating because
it's easy to blur with Phase 4C:** *"Auth screen re-skin is cosmetic only. No
auth behavioral changes belong here — those are the Phase 4C auth cutover
items."* Recoloring the login/magic-link screens is fair game without any
gate phrase beyond the normal Locked Files list (auth screens likely live
outside `App.jsx` proper — confirm on start). Touching `useAuth.js` behavior,
session handling, or the shim removal is not in scope here — that's Phase 4C.

**First concrete step:** find and inventory every auth-screen component
currently using the drift palette (likely `frontend/src/components/auth/` or
similar — not confirmed this session, first real task is locating them),
cross-reference against the design-token system's existing color tokens, and
determine whether a new token needs minting (same "mint by role, not
appearance" convention as `color.brand.gradientDark`) or an existing one
applies.

### 2. Draft the scoring-tables GRANT-revocation migration (recon/design only — do NOT apply)

This is Phase 4C's actual next concrete gap, and it's more than a mechanical
copy of migration 021's pattern — flagging the design question explicitly so
it gets decided deliberately, not defaulted into:

- **Migration 004/021's established pattern** (for `team_data`/`teams`/
  `roster_snapshots`) is "keep broad `anon`/`authenticated` grants, let RLS do
  the scoping, only revoke the genuinely dangerous ops (TRUNCATE, DELETE)."
- **That pattern likely does NOT fit the scoring tables.** KK already
  confirmed (2026-08-07, recorded in `PHASE4C_SCORING_RLS_PROPOSAL.md` §1.4)
  that the `public_read_*` anon-SELECT policies are unintentional leftovers,
  not a deliberate viewer design — meaning there's no validated anon use case
  at all here, unlike `teams`/`team_data` which do have legitimate anon reads.
  The likely-correct target is `anon` gets **zero** grants on all 4 tables,
  not "keep SELECT, rely on RLS."
- **Per-table `authenticated` grants aren't uniform either** — migration 019
  Section A's own policies imply the real access pattern: `game_scoring_
  sessions` needs `DELETE` (the "Hand off scoring" flow releases the lock,
  per root `CLAUDE.md`'s Game Mode Action Tiers), but `live_game_state`,
  `scoring_audit_log`, and `at_bats` have no DELETE or UPDATE policies at all
  in Section A for the latter two (append-only by design) — their grants
  should probably follow that, not a blanket "give authenticated everything."
- **TRUNCATE should be revoked from both roles on all 4 tables regardless**
  — no code path anywhere calls it, same reasoning as every prior REVOKE
  migration in this tree.

This needs KK's explicit design sign-off before drafting the final SQL, the
same way scorekeeper-role-inclusion and the `public_read_*` disposition were
each explicitly confirmed before migration 019 was written — don't default
into a design silently. Once confirmed, this becomes migration `022`,
committed with the same "PROPOSAL, not applied" framing 019 used, then
sequenced **alongside Section B** (per the existing note in
`PHASE4C_SCORING_RLS_PROPOSAL.md` §3 step 4) — not before it, not instead of
it.

### 3. Phase 4C steps 2-7 (blocked, needs KK present)

Per `PHASE4C_SCORING_RLS_PROPOSAL.md` §3: frontend shim flip (step 2, needs
`game-mode/*` gate phrase) → prod soak with KK actively scoring a real game
(step 3) → Section B + the new GRANT migration together (step 4) → un-skip
`LS1`-`LS7` (step 5) → column-type restore (step 6) → remove `isAdminTestMode`
(step 7). Do not start step 2 solo — same standard as every other live
game-day surface change in this repo.

### 4. Small doc fixes, whenever convenient

The two stale lines in the "Open items" table above — `CLAUDE.md`'s Active
Tracks section and `UX_REFACTOR_ROADMAP.md`'s worktree path. Neither is
urgent; bundle with other work rather than a dedicated session.

---

## Branch/worktree state (as of session 2026-08-17-A's close)

- Two worktrees on this machine: `lineup_generator` and `lineup-generator-ux`,
  both fast-forwarded to `develop` @ `20c8323`, both confirmed clean.
- UX worktree had drifted onto a since-merged branch
  (`docs/story-133-scope-expansion`, PR #701) — moved back to its proper
  `ux-local-base` tracking branch and fast-forwarded 22 commits. Worth a
  standing reminder: if a worktree isn't on its expected base branch at
  session start, check whether it's parked on a stale feature branch before
  assuming anything's wrong with the repo itself.
- All PRs opened this session (#681, #695, #702) merged and their branches
  deleted, both locally and on origin (GitHub auto-deletes on merge).
- The stash on `chore/agent-onboarding-docs` mentioned above was resolved
  as its own PR (#695) — restored, trimmed a redundant line, shipped.
- `sync-stories-to-issues.js --dry-run` re-run clean at session close — all
  `ROADMAP.md` stories still linked to issues, nothing pending.
- `origin/spike/phase4b-slice10-scoping` — still the same stale remote branch
  flagged above, still not investigated further. Still not urgent.
